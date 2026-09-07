package dev.kazuki.typingapp.api.repository;

import static org.assertj.core.api.Assertions.assertThat;

import dev.kazuki.typingapp.api.entity.User;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * P5-06完了条件「Repositoryのfind系メソッドが動く状態」の確認用。
 * ローカルのdocker composeで起動したPostgreSQL(V1__create_schema.sql + R__seed_topic_master.sql
 * 適用済み)に接続して実行する。@Transactionalによりテスト後は自動ロールバックされる。
 */
@SpringBootTest
@Transactional
class RepositorySmokeTest {

    @Autowired private UserRepository userRepository;
    @Autowired private TopicSetRepository topicSetRepository;
    @Autowired private SentenceRepository sentenceRepository;
    @Autowired private SessionRepository sessionRepository;
    @Autowired private MissRecordRepository missRecordRepository;
    @Autowired private SessionKanaCountRepository sessionKanaCountRepository;

    @Test
    void findByName_findsSavedUser() {
        userRepository.save(new User("たいぴんぐ太郎"));

        Optional<User> found = userRepository.findByName("たいぴんぐ太郎");

        assertThat(found).isPresent();
    }

    @Test
    void findAllByOrderBySortOrder_returnsSeededTopicSetsInOrder() {
        List<String> names =
                topicSetRepository.findAllByOrderBySortOrder().stream().map(t -> t.getName()).toList();

        assertThat(names).containsExactly("初級", "中級", "上級");
    }

    @Test
    void findByTopicSetIdOrderById_returnsSeededSentences() {
        List<String> texts =
                sentenceRepository.findByTopicSetIdOrderById(1L).stream().map(s -> s.getText()).toList();

        assertThat(texts).containsExactly("あさ", "がっこう", "ほんや", "けーき", "きゃべつ");
    }

    @Test
    void findPersonalBest_returnsNullValuesWhenNoSessions() {
        PersonalBestProjection best = sessionRepository.findPersonalBest(999_999L, 999_999L);

        assertThat(best.getNetKpmBest()).isNull();
        assertThat(best.getAccuracyBest()).isNull();
    }

    @Test
    void missAnalysisQueries_returnEmptyWhenNoData() {
        assertThat(missRecordRepository.findDistinctMissUnitsByUserId(999_999L)).isEmpty();
        assertThat(missRecordRepository.countByExpectedAndActualKey(999_999L)).isEmpty();
        assertThat(sessionKanaCountRepository.sumTotalCountByKana(999_999L)).isEmpty();
        assertThat(sessionKanaCountRepository.sumTotalCountByCharType(999_999L)).isEmpty();
    }
}
