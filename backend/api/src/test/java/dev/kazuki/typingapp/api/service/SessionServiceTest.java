package dev.kazuki.typingapp.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import dev.kazuki.typingapp.api.dto.KanaCountInputDto;
import dev.kazuki.typingapp.api.dto.MissRecordInputDto;
import dev.kazuki.typingapp.api.dto.PersonalBestResponse;
import dev.kazuki.typingapp.api.dto.SessionResultResponse;
import dev.kazuki.typingapp.api.dto.SessionSubmissionRequest;
import dev.kazuki.typingapp.api.dto.SessionSummaryResponse;
import dev.kazuki.typingapp.api.entity.CharType;
import dev.kazuki.typingapp.api.entity.EndConditionType;
import dev.kazuki.typingapp.api.entity.User;
import dev.kazuki.typingapp.api.exception.InvalidSessionSubmissionException;
import dev.kazuki.typingapp.api.exception.TopicSetNotFoundException;
import dev.kazuki.typingapp.api.exception.UserNotFoundException;
import dev.kazuki.typingapp.api.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/** 実DB(docker)に接続してセッション保存・自己ベスト比較の実際の挙動を確認する(P5-09)。 */
@SpringBootTest
@Transactional
class SessionServiceTest {

    /** `R__seed_topic_master.sql`の初級。 */
    private static final Long BEGINNER_TOPIC_SET_ID = 1L;

    @Autowired private SessionService sessionService;
    @Autowired private UserRepository userRepository;

    private Long createUser(String name) {
        return userRepository.save(new User(name)).getId();
    }

    private SessionSubmissionRequest request(Long userId, int correctKeyCount, int durationSeconds) {
        return new SessionSubmissionRequest(
                userId,
                BEGINNER_TOPIC_SET_ID,
                EndConditionType.sentence_count,
                10,
                correctKeyCount,
                durationSeconds,
                List.of(100, 120, 110),
                List.of(new MissRecordInputDto(1, "し", "c,s", "x", null, CharType.清音)),
                List.of(new KanaCountInputDto("し", CharType.清音, 3)));
    }

    @Test
    void submitSession_firstSessionHasNoPreviousBestAndIsBest() {
        Long userId = createUser("セッション太郎");

        SessionResultResponse result = sessionService.submitSession(request(userId, 100, 60));

        assertThat(result.sessionId()).isNotNull();
        assertThat(result.previousBest()).isNull();
        assertThat(result.isNetKpmBest()).isTrue();
        assertThat(result.isAccuracyBest()).isTrue();
    }

    @Test
    void submitSession_secondBetterSessionUpdatesBest() {
        Long userId = createUser("セッション次郎");
        sessionService.submitSession(request(userId, 100, 60));

        SessionResultResponse second = sessionService.submitSession(request(userId, 200, 60));

        assertThat(second.previousBest()).isNotNull();
        assertThat(second.isNetKpmBest()).isTrue();
    }

    @Test
    void submitSession_secondWorseSessionIsNotBest() {
        Long userId = createUser("セッション三郎");
        sessionService.submitSession(request(userId, 200, 60));

        SessionResultResponse second = sessionService.submitSession(request(userId, 100, 60));

        assertThat(second.isNetKpmBest()).isFalse();
    }

    @Test
    void submitSession_throwsWhenUserDoesNotExist() {
        assertThatThrownBy(() -> sessionService.submitSession(request(999_999L, 100, 60)))
                .isInstanceOf(UserNotFoundException.class);
    }

    @Test
    void submitSession_throwsWhenTopicSetDoesNotExist() {
        Long userId = createUser("セッション四郎");
        SessionSubmissionRequest invalid =
                new SessionSubmissionRequest(
                        userId,
                        999_999L,
                        EndConditionType.sentence_count,
                        10,
                        100,
                        60,
                        List.of(100),
                        List.of(),
                        List.of());

        assertThatThrownBy(() -> sessionService.submitSession(invalid))
                .isInstanceOf(TopicSetNotFoundException.class);
    }

    @Test
    void submitSession_throwsWhenEndConditionValueOutOfRange() {
        Long userId = createUser("セッション五郎");
        SessionSubmissionRequest invalid =
                new SessionSubmissionRequest(
                        userId,
                        BEGINNER_TOPIC_SET_ID,
                        EndConditionType.sentence_count,
                        999,
                        100,
                        60,
                        List.of(100),
                        List.of(),
                        List.of());

        assertThatThrownBy(() -> sessionService.submitSession(invalid))
                .isInstanceOf(InvalidSessionSubmissionException.class);
    }

    @Test
    void submitSession_throwsWhenDurationSecondsIsNegative() {
        Long userId = createUser("セッション六郎");

        assertThatThrownBy(() -> sessionService.submitSession(request(userId, 100, -1)))
                .isInstanceOf(InvalidSessionSubmissionException.class);
    }

    @Test
    void submitSession_throwsWhenKanaCountsHasDuplicateKana() {
        Long userId = createUser("セッション七郎");
        SessionSubmissionRequest invalid =
                new SessionSubmissionRequest(
                        userId,
                        BEGINNER_TOPIC_SET_ID,
                        EndConditionType.sentence_count,
                        10,
                        100,
                        60,
                        List.of(100),
                        List.of(),
                        List.of(
                                new KanaCountInputDto("し", CharType.清音, 1),
                                new KanaCountInputDto("し", CharType.清音, 2)));

        assertThatThrownBy(() -> sessionService.submitSession(invalid))
                .isInstanceOf(InvalidSessionSubmissionException.class);
    }

    @Test
    void submitSession_throwsWhenMissRecordKanaNotInKanaCounts() {
        Long userId = createUser("セッション八郎");
        SessionSubmissionRequest invalid =
                new SessionSubmissionRequest(
                        userId,
                        BEGINNER_TOPIC_SET_ID,
                        EndConditionType.sentence_count,
                        10,
                        100,
                        60,
                        List.of(100),
                        List.of(new MissRecordInputDto(1, "ん", "n", "x", null, CharType.撥音ん)),
                        List.of(new KanaCountInputDto("し", CharType.清音, 1)));

        assertThatThrownBy(() -> sessionService.submitSession(invalid))
                .isInstanceOf(InvalidSessionSubmissionException.class);
    }

    @Test
    void listSessionHistory_returnsSessionsNewestFirst() {
        Long userId = createUser("セッション九郎");
        sessionService.submitSession(request(userId, 100, 60));
        sessionService.submitSession(request(userId, 150, 60));

        List<SessionSummaryResponse> history = sessionService.listSessionHistory(userId);

        assertThat(history).hasSize(2);
        assertThat(history.get(0).topicSetName()).isEqualTo("初級");
    }

    @Test
    void listSessionHistory_throwsWhenUserDoesNotExist() {
        assertThatThrownBy(() -> sessionService.listSessionHistory(999_999L))
                .isInstanceOf(UserNotFoundException.class);
    }

    @Test
    void getPersonalBest_returnsNullValuesWhenNoSessions() {
        Long userId = createUser("セッション十郎");

        PersonalBestResponse best = sessionService.getPersonalBest(userId, BEGINNER_TOPIC_SET_ID);

        assertThat(best.netKpmBest()).isNull();
        assertThat(best.accuracyBest()).isNull();
    }

    @Test
    void getPersonalBest_throwsWhenUserDoesNotExist() {
        assertThatThrownBy(() -> sessionService.getPersonalBest(999_999L, BEGINNER_TOPIC_SET_ID))
                .isInstanceOf(UserNotFoundException.class);
    }
}
