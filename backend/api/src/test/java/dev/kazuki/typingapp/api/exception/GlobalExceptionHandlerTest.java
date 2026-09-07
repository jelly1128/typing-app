package dev.kazuki.typingapp.api.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

/** class-design.md 1.4の例外→応答対応表どおりに4xx/500が返ることを確認する(P5-11)。 */
@WebMvcTest(controllers = ThrowingTestController.class)
class GlobalExceptionHandlerTest {

    @Autowired private MockMvc mockMvc;

    @Test
    void userNotFound_returns404() throws Exception {
        mockMvc.perform(get("/test/user-not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.traceId").isNotEmpty());
    }

    @Test
    void topicSetNotFound_returns404() throws Exception {
        mockMvc.perform(get("/test/topic-set-not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("TOPIC_SET_NOT_FOUND"));
    }

    @Test
    void invalidSessionSubmission_returns400() throws Exception {
        mockMvc.perform(get("/test/invalid-session"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("durationSeconds must not be negative"));
    }

    @Test
    void invalidRequest_returns400() throws Exception {
        mockMvc.perform(get("/test/invalid-request"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("name must not be empty"));
    }

    @Test
    void dataAccessException_returns500() throws Exception {
        mockMvc.perform(get("/test/data-access"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"));
    }

    @Test
    void unexpectedException_returns500() throws Exception {
        mockMvc.perform(get("/test/unexpected"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"));
    }
}
