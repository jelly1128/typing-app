package dev.kazuki.typingapp.api.service;

import dev.kazuki.typingapp.api.dto.SentenceResponse;
import dev.kazuki.typingapp.api.dto.TopicSetResponse;
import dev.kazuki.typingapp.api.entity.Sentence;
import dev.kazuki.typingapp.api.exception.TopicSetNotFoundException;
import dev.kazuki.typingapp.api.repository.SentenceRepository;
import dev.kazuki.typingapp.api.repository.TopicSetRepository;
import java.util.List;
import org.springframework.stereotype.Service;

/** FR-01, FR-13: お題セット一覧・お題文一覧の取得。 */
@Service
public class TopicSetService {

    private final TopicSetRepository topicSetRepository;
    private final SentenceRepository sentenceRepository;

    public TopicSetService(TopicSetRepository topicSetRepository, SentenceRepository sentenceRepository) {
        this.topicSetRepository = topicSetRepository;
        this.sentenceRepository = sentenceRepository;
    }

    public List<TopicSetResponse> listTopicSets() {
        return topicSetRepository.findAllByOrderBySortOrder().stream()
                .map(t -> new TopicSetResponse(t.getId(), t.getName(), t.getDescription()))
                .toList();
    }

    /**
     * topicSetId不在なら404。取得結果が0件の場合も404にする
     * (api-spec.yaml `GET /topic-sets/{id}/sentences`の404条件、class-design.md 1.4)。
     */
    public List<SentenceResponse> listSentences(Long topicSetId) {
        if (!topicSetRepository.existsById(topicSetId)) {
            throw new TopicSetNotFoundException(topicSetId);
        }
        List<Sentence> sentences = sentenceRepository.findByTopicSetIdOrderById(topicSetId);
        if (sentences.isEmpty()) {
            throw new TopicSetNotFoundException(topicSetId);
        }
        return sentences.stream()
                .map(s -> new SentenceResponse(s.getId(), s.getText(), s.getMoraList()))
                .toList();
    }
}
