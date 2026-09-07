package dev.kazuki.typingapp.api.dto;

/** {@code api-spec.yaml} `MissAnalysis.byErrorPattern`の1要素(FR-10(2))。 */
public record ErrorPatternStatDto(String expectedKey, String actualKey, int count) {}
