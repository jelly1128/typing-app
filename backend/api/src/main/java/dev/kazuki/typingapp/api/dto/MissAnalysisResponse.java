package dev.kazuki.typingapp.api.dto;

import java.util.List;

/** {@code GET /api/users/{userId}/miss-analysis}のレスポンス(FR-10, FR-11、`api-spec.yaml` `MissAnalysis`)。 */
public record MissAnalysisResponse(
        List<KanaMissStatDto> byKana,
        List<ErrorPatternStatDto> byErrorPattern,
        List<PrevKanaStatDto> byPrevKana,
        List<CharTypeStatDto> byCharType,
        List<String> advice) {}
