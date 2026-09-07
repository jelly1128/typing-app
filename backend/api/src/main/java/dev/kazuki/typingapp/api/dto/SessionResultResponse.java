package dev.kazuki.typingapp.api.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** {@code POST /api/sessions}のレスポンス(FR-04〜09、`api-spec.yaml` `SessionResult`)。 */
public record SessionResultResponse(
        Long sessionId,
        BigDecimal netKpm,
        BigDecimal rawKpm,
        BigDecimal accuracy,
        BigDecimal consistency,
        Integer durationSeconds,
        LocalDateTime playedAt,
        PersonalBestResponse previousBest,
        boolean isNetKpmBest,
        boolean isAccuracyBest) {}
