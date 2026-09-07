package dev.kazuki.typingapp.api.dto;

/** {@code api-spec.yaml} `MissAnalysis.byKana`の1要素(FR-10(1))。 */
public record KanaMissStatDto(String kana, int missCount, int occurrenceCount, double missRate) {}
