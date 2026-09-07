package dev.kazuki.typingapp.api.dto;

/** {@code api-spec.yaml} `MissAnalysis.byPrevKana`の1要素(FR-10(3)、分母は近似。er-diagram.md 3.3)。 */
public record PrevKanaStatDto(String prevKana, double missRate) {}
