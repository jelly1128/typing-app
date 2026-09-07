package dev.kazuki.typingapp.api.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.kazuki.typingapp.api.dto.PersonalBestResponse;
import dev.kazuki.typingapp.api.dto.SessionResultResponse;
import dev.kazuki.typingapp.api.dto.SessionSummaryResponse;
import dev.kazuki.typingapp.api.entity.EndConditionType;
import dev.kazuki.typingapp.api.service.SessionService;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** HTTP層のマッピングだけを確認する(Serviceはモック)。 */
@WebMvcTest(controllers = SessionController.class)
class SessionControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private SessionService sessionService;

    @Test
    void submitSession_returns201() throws Exception {
        when(sessionService.submitSession(org.mockito.ArgumentMatchers.any()))
                .thenReturn(
                        new SessionResultResponse(
                                1L,
                                new BigDecimal("120.00"),
                                new BigDecimal("125.00"),
                                new BigDecimal("96.00"),
                                new BigDecimal("50.00"),
                                60,
                                LocalDateTime.now(),
                                null,
                                true,
                                true));

        String body =
                """
                {
                  "userId": 1, "topicSetId": 1, "endConditionType": "sentence_count",
                  "endConditionValue": 10, "correctKeyCount": 100, "durationSeconds": 60,
                  "keystrokeIntervalsMs": [100, 120],
                  "missRecords": [], "kanaCounts": []
                }
                """;

        mockMvc.perform(post("/api/sessions").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId").value(1))
                .andExpect(jsonPath("$.isNetKpmBest").value(true));
    }

    @Test
    void listSessionHistory_returns200WithArray() throws Exception {
        when(sessionService.listSessionHistory(1L))
                .thenReturn(
                        List.of(
                                new SessionSummaryResponse(
                                        1L,
                                        "初級",
                                        EndConditionType.sentence_count,
                                        10,
                                        LocalDateTime.now(),
                                        new BigDecimal("120.00"),
                                        new BigDecimal("96.00"),
                                        60)));

        mockMvc.perform(get("/api/users/1/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].topicSetName").value("初級"));
    }

    @Test
    void getPersonalBest_returns200() throws Exception {
        when(sessionService.getPersonalBest(1L, 1L))
                .thenReturn(new PersonalBestResponse(1L, new BigDecimal("120.00"), new BigDecimal("96.00")));

        mockMvc.perform(get("/api/users/1/best").param("topicSetId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.netKpmBest").value(120.00));
    }
}
