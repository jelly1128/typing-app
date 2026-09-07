package dev.kazuki.typingapp.api.dto;

import dev.kazuki.typingapp.api.entity.CharType;

/** {@code api-spec.yaml} `MissAnalysis.byCharType`の1要素(FR-10(4))。出現回数0の文字種は含めない(CL-007)。 */
public record CharTypeStatDto(CharType charType, int occurrenceCount, double accuracyRate) {}
