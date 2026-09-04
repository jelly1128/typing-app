package dev.kazuki.typingapp.core;

// AdviceGenerator.generate() の入力の一部(カテゴリ3: 文字種別正解率)。
// api-spec.yaml MissAnalysis.byCharType の1要素に対応(FR-11)。
// 出現回数0の文字種は含まれない前提(api-spec.yaml CL-007)。
public record CharTypeStat(
    String charType,
    int occurrenceCount,
    double accuracyRate
) {}
