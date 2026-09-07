package dev.kazuki.typingapp.api.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.kazuki.typingapp.api.dto.SentenceResponse;
import dev.kazuki.typingapp.api.dto.TopicSetResponse;
import dev.kazuki.typingapp.api.exception.TopicSetNotFoundException;
import dev.kazuki.typingapp.api.service.TopicSetService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** HTTP層のマッピングだけを確認する(Serviceはモック)。 */
@WebMvcTest(controllers = TopicSetController.class)
class TopicSetControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private TopicSetService topicSetService;

    @Test
    void listTopicSets_returns200WithArray() throws Exception {
        when(topicSetService.listTopicSets())
                .thenReturn(List.of(new TopicSetResponse(1L, "初級", "ひらがなの短い単語")));

        mockMvc.perform(get("/api/topic-sets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("初級"));
    }

    @Test
    void listSentences_returns200WithArray() throws Exception {
        when(topicSetService.listSentences(1L))
                .thenReturn(List.of(new SentenceResponse(1L, "あさ", List.of("あ", "さ"))));

        mockMvc.perform(get("/api/topic-sets/1/sentences"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].text").value("あさ"))
                .andExpect(jsonPath("$[0].moraList[0]").value("あ"));
    }

    @Test
    void listSentences_returns404WhenTopicSetNotFound() throws Exception {
        when(topicSetService.listSentences(999L)).thenThrow(new TopicSetNotFoundException(999L));

        mockMvc.perform(get("/api/topic-sets/999/sentences"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TOPIC_SET_NOT_FOUND"));
    }

    @Test
    void listSentences_returns400WhenTopicSetIdIsNotNumeric() throws Exception {
        mockMvc.perform(get("/api/topic-sets/abc/sentences"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
