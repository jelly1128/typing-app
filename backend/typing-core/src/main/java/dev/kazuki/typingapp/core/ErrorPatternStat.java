package dev.kazuki.typingapp.core;

// AdviceGenerator.generate() の入力の一部(カテゴリ1: 誤りパターン)。
// api-spec.yaml MissAnalysis.byErrorPattern の1要素に対応(FR-11)。
public record ErrorPatternStat(
    String expectedKey,
    String actualKey,
    int count
) {}
