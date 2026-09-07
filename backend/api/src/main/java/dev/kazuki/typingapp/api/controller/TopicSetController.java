package dev.kazuki.typingapp.api.controller;

import dev.kazuki.typingapp.api.dto.SentenceResponse;
import dev.kazuki.typingapp.api.dto.TopicSetResponse;
import dev.kazuki.typingapp.api.service.TopicSetService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** {@code GET /api/topic-sets}, {@code GET /api/topic-sets/{topicSetId}/sentences}(FR-01, FR-13)。 */
@RestController
public class TopicSetController {

    private final TopicSetService topicSetService;

    public TopicSetController(TopicSetService topicSetService) {
        this.topicSetService = topicSetService;
    }

    @GetMapping("/api/topic-sets")
    public List<TopicSetResponse> listTopicSets() {
        return topicSetService.listTopicSets();
    }

    @GetMapping("/api/topic-sets/{topicSetId}/sentences")
    public List<SentenceResponse> listSentences(@PathVariable Long topicSetId) {
        return topicSetService.listSentences(topicSetId);
    }
}
