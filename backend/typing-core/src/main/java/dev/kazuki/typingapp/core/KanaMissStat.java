package dev.kazuki.typingapp.core;

// AdviceGenerator.generate() の入力の一部(カテゴリ2: かな別ミス)。
// api-spec.yaml MissAnalysis.byKana の1要素に対応(FR-11)。
public record KanaMissStat(
    String kana,
    int missCount,
    int occurrenceCount,
    double missRate
) {}
