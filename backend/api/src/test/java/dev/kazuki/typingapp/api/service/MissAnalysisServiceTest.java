package dev.kazuki.typingapp.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import dev.kazuki.typingapp.api.dto.CharTypeStatDto;
import dev.kazuki.typingapp.api.dto.ErrorPatternStatDto;
import dev.kazuki.typingapp.api.dto.KanaCountInputDto;
import dev.kazuki.typingapp.api.dto.KanaMissStatDto;
import dev.kazuki.typingapp.api.dto.MissAnalysisResponse;
import dev.kazuki.typingapp.api.dto.MissRecordInputDto;
import dev.kazuki.typingapp.api.dto.PrevKanaStatDto;
import dev.kazuki.typingapp.api.dto.SessionSubmissionRequest;
import dev.kazuki.typingapp.api.entity.CharType;
import dev.kazuki.typingapp.api.entity.EndConditionType;
import dev.kazuki.typingapp.api.entity.User;
import dev.kazuki.typingapp.api.exception.UserNotFoundException;
import dev.kazuki.typingapp.api.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * 実DB(docker)に接続して4観点の集計を確認する(P5-10)。
 * {@link SessionService#submitSession}経由でミス記録・かな出現回数を実際に保存してから検証する。
 */
@SpringBootTest
@Transactional
class MissAnalysisServiceTest {

    private static final Long BEGINNER_TOPIC_SET_ID = 1L;

    @Autowired private MissAnalysisService missAnalysisService;
    @Autowired private SessionService sessionService;
    @Autowired private UserRepository userRepository;

    private Long createUser(String name) {
        return userRepository.save(new User(name)).getId();
    }

    @Test
    void getMissAnalysis_aggregatesAcrossSessions() {
        Long userId = createUser("分析太郎");

        // セッション1: 「し」を"x"で2回ミス(同じ拍への複数回ミス。byKanaは1、byErrorPatternは2と数える)
        sessionService.submitSession(
                new SessionSubmissionRequest(
                        userId,
                        BEGINNER_TOPIC_SET_ID,
                        EndConditionType.sentence_count,
                        10,
                        10,
                        30,
                        List.of(100, 100),
                        List.of(
                                new MissRecordInputDto(1, "し", "c,s", "x", null, CharType.清音),
                                new MissRecordInputDto(1, "し", "c,s", "x", null, CharType.清音)),
                        List.of(new KanaCountInputDto("し", CharType.清音, 5))));

        // セッション2: 「こ」の直後の「ん」を"n"でミス
        sessionService.submitSession(
                new SessionSubmissionRequest(
                        userId,
                        BEGINNER_TOPIC_SET_ID,
                        EndConditionType.sentence_count,
                        10,
                        10,
                        30,
                        List.of(100, 100),
                        List.of(new MissRecordInputDto(1, "ん", "nn", "n", "こ", CharType.撥音ん)),
                        List.of(
                                new KanaCountInputDto("こ", CharType.清音, 2),
                                new KanaCountInputDto("ん", CharType.撥音ん, 3))));

        MissAnalysisResponse analysis = missAnalysisService.getMissAnalysis(userId);

        KanaMissStatDto shiStat =
                analysis.byKana().stream().filter(k -> k.kana().equals("し")).findFirst().orElseThrow();
        assertThat(shiStat.missCount()).isEqualTo(1);
        assertThat(shiStat.occurrenceCount()).isEqualTo(5);
        assertThat(shiStat.missRate()).isEqualTo(20.0);

        ErrorPatternStatDto errorPattern =
                analysis.byErrorPattern().stream()
                        .filter(e -> e.expectedKey().equals("c,s") && e.actualKey().equals("x"))
                        .findFirst()
                        .orElseThrow();
        assertThat(errorPattern.count()).isEqualTo(2);

        PrevKanaStatDto prevKanaStat =
                analysis.byPrevKana().stream().filter(p -> p.prevKana().equals("こ")).findFirst().orElseThrow();
        assertThat(prevKanaStat.missRate()).isEqualTo(50.0);

        CharTypeStatDto seiOnStat =
                analysis.byCharType().stream()
                        .filter(c -> c.charType() == CharType.清音)
                        .findFirst()
                        .orElseThrow();
        assertThat(seiOnStat.occurrenceCount()).isEqualTo(7);

        assertThat(analysis.advice()).isNotEmpty();
    }

    @Test
    void getMissAnalysis_returnsEmptyListsWhenNoData() {
        Long userId = createUser("分析次郎");

        MissAnalysisResponse analysis = missAnalysisService.getMissAnalysis(userId);

        assertThat(analysis.byKana()).isEmpty();
        assertThat(analysis.byErrorPattern()).isEmpty();
        assertThat(analysis.byPrevKana()).isEmpty();
        assertThat(analysis.byCharType()).isEmpty();
        assertThat(analysis.advice()).isEmpty();
    }

    @Test
    void getMissAnalysis_throwsWhenUserDoesNotExist() {
        assertThatThrownBy(() -> missAnalysisService.getMissAnalysis(999_999L))
                .isInstanceOf(UserNotFoundException.class);
    }
}
