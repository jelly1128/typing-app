package dev.kazuki.typingapp.api.dto;

import java.util.List;

/** {@code api-spec.yaml} `Sentence`スキーマ(FR-01)。 */
public record SentenceResponse(Long id, String text, List<String> moraList) {}
