package dev.kazuki.typingapp.api.repository;

import dev.kazuki.typingapp.api.entity.EndConditionType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** {@link SessionRepository#findSummariesByUserIdOrderByPlayedAtDesc} の戻り値(FR-08)。 */
public interface SessionSummaryProjection {
    Long getId();

    String getTopicSetName();

    EndConditionType getEndConditionType();

    Integer getEndConditionValue();

    LocalDateTime getPlayedAt();

    BigDecimal getNetKpm();

    BigDecimal getAccuracy();

    Integer getDurationSeconds();
}
