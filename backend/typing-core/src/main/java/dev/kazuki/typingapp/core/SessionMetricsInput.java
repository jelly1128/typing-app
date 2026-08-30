package dev.kazuki.typingapp.core;

// SessionMetricsCalculator.calculate() の入力。
// logic-spec/session-metrics.md 1章の構造体に対応(FR-06)。
public record SessionMetricsInput(
    int correctKeyCount,
    int missRecordCount,
    int[] keystrokeIntervalsMs,
    int durationSeconds
) {}