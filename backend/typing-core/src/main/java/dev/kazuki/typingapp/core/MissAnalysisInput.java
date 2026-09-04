package dev.kazuki.typingapp.core;

import java.util.List;

// AdviceGenerator.generate() の入力。
// logic-spec/advice-generation.md 1章の構造体に対応(FR-11)。
// byPrevKana はアドバイス生成に使わない設計判断(同仕様4章#1)のため含めない。
public record MissAnalysisInput(
    List<KanaMissStat> byKana,
    List<ErrorPatternStat> byErrorPattern,
    List<CharTypeStat> byCharType
) {}
