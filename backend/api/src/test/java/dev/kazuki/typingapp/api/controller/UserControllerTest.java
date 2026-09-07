package dev.kazuki.typingapp.api.controller;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.kazuki.typingapp.api.dto.UserResponse;
import dev.kazuki.typingapp.api.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** {@code POST /api/users}のHTTP層のマッピングだけを確認する(Serviceはモック)。 */
@WebMvcTest(controllers = UserController.class)
class UserControllerTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private UserService userService;

    @Test
    void identifyUser_returns200WithBody() throws Exception {
        when(userService.identifyUser(eq("たいぴんぐ太郎")))
                .thenReturn(new UserResponse(1L, "たいぴんぐ太郎"));

        mockMvc.perform(
                        post("/api/users")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"たいぴんぐ太郎\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("たいぴんぐ太郎"));
    }
}
