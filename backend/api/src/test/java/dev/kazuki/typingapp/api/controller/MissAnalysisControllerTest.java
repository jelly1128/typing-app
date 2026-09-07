package dev.kazuki.typingapp.api.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.kazuki.typingapp.api.dto.KanaMissStatDto;
import dev.kazuki.typingapp.api.dto.MissAnalysisResponse;
import dev.kazuki.typingapp.api.exception.UserNotFoundException;
import dev.kazuki.typingapp.api.service.MissAnalysisService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** HTTP層のマッピングだけを確認する(Serviceはモック)。 */
@WebMvcTest(controllers = MissAnalysisController.class)
class MissAnalysisControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private MissAnalysisService missAnalysisService;

    @Test
    void getMissAnalysis_returns200() throws Exception {
        when(missAnalysisService.getMissAnalysis(1L))
                .thenReturn(
                        new MissAnalysisResponse(
                                List.of(new KanaMissStatDto("し", 1, 5, 20.0)),
                                List.of(),
                                List.of(),
                                List.of(),
                                List.of("目立った苦手は見つかりませんでした。この調子で練習を続けましょう。")));

        mockMvc.perform(get("/api/users/1/miss-analysis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.byKana[0].kana").value("し"))
                .andExpect(jsonPath("$.advice[0]").isNotEmpty());
    }

    @Test
    void getMissAnalysis_returns404WhenUserNotFound() throws Exception {
        when(missAnalysisService.getMissAnalysis(999L)).thenThrow(new UserNotFoundException(999L));

        mockMvc.perform(get("/api/users/999/miss-analysis"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));
    }
}
