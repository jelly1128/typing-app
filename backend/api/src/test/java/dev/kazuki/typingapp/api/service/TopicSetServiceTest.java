package dev.kazuki.typingapp.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import dev.kazuki.typingapp.api.dto.SentenceResponse;
import dev.kazuki.typingapp.api.dto.TopicSetResponse;
import dev.kazuki.typingapp.api.exception.TopicSetNotFoundException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * `R__seed_topic_master.sql`のシードデータ(初級=id1/5文、中級=id2/5文、上級=id3/5文)を
 * 前提に、実DB(docker)で確認する(P5-08)。
 */
@SpringBootTest
@Transactional
class TopicSetServiceTest {

    @Autowired private TopicSetService topicSetService;

    @Test
    void listTopicSets_returnsSeededTopicSetsInSortOrder() {
        List<String> names = topicSetService.listTopicSets().stream().map(TopicSetResponse::name).toList();

        assertThat(names).containsExactly("初級", "中級", "上級");
    }

    @Test
    void listSentences_returnsSeededSentencesForBeginnerSet() {
        List<SentenceResponse> sentences = topicSetService.listSentences(1L);

        assertThat(sentences).hasSize(5);
        assertThat(sentences.get(0).text()).isEqualTo("あさ");
        assertThat(sentences.get(0).moraList()).containsExactly("あ", "さ");
    }

    @Test
    void listSentences_throwsWhenTopicSetDoesNotExist() {
        assertThatThrownBy(() -> topicSetService.listSentences(999_999L))
                .isInstanceOf(TopicSetNotFoundException.class);
    }
}
