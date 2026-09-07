package dev.kazuki.typingapp.api.controller;

import dev.kazuki.typingapp.api.dto.PersonalBestResponse;
import dev.kazuki.typingapp.api.dto.SessionResultResponse;
import dev.kazuki.typingapp.api.dto.SessionSubmissionRequest;
import dev.kazuki.typingapp.api.dto.SessionSummaryResponse;
import dev.kazuki.typingapp.api.service.SessionService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code POST /api/sessions}, {@code GET /api/users/{userId}/sessions},
 * {@code GET /api/users/{userId}/best}(FR-04〜09)。
 */
@RestController
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping("/api/sessions")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionResultResponse submitSession(@RequestBody SessionSubmissionRequest request) {
        return sessionService.submitSession(request);
    }

    @GetMapping("/api/users/{userId}/sessions")
    public List<SessionSummaryResponse> listSessionHistory(@PathVariable Long userId) {
        return sessionService.listSessionHistory(userId);
    }

    @GetMapping("/api/users/{userId}/best")
    public PersonalBestResponse getPersonalBest(
            @PathVariable Long userId, @RequestParam Long topicSetId) {
        return sessionService.getPersonalBest(userId, topicSetId);
    }
}
