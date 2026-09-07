package dev.kazuki.typingapp.api.controller;

import dev.kazuki.typingapp.api.dto.MissAnalysisResponse;
import dev.kazuki.typingapp.api.service.MissAnalysisService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** {@code GET /api/users/{userId}/miss-analysis}(FR-10, FR-11)。 */
@RestController
public class MissAnalysisController {

    private final MissAnalysisService missAnalysisService;

    public MissAnalysisController(MissAnalysisService missAnalysisService) {
        this.missAnalysisService = missAnalysisService;
    }

    @GetMapping("/api/users/{userId}/miss-analysis")
    public MissAnalysisResponse getMissAnalysis(@PathVariable Long userId) {
        return missAnalysisService.getMissAnalysis(userId);
    }
}
