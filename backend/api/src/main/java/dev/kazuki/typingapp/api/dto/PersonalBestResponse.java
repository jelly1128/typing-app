package dev.kazuki.typingapp.api.dto;

import java.math.BigDecimal;

/** {@code api-spec.yaml} `PersonalBest`スキーマ(FR-09)。 */
public record PersonalBestResponse(Long topicSetId, BigDecimal netKpmBest, BigDecimal accuracyBest) {}
