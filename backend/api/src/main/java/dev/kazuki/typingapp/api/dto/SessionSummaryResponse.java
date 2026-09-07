package dev.kazuki.typingapp.api.dto;

import dev.kazuki.typingapp.api.entity.EndConditionType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** {@code GET /api/users/{userId}/sessions}のレスポンス要素(FR-08、`api-spec.yaml` `SessionSummary`)。 */
public record SessionSummaryResponse(
        Long id,
        String topicSetName,
        EndConditionType endConditionType,
        Integer endConditionValue,
        LocalDateTime playedAt,
        BigDecimal netKpm,
        BigDecimal accuracy,
        Integer durationSeconds) {}
