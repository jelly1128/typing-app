package dev.kazuki.typingapp.core;

// SessionMetricsCalculator.calculate() の出力。
// netKpm/rawKpm/accuracy/consistency は小数第2位でHALF_UP丸め済み(session-metrics.md 3章)。
// durationSeconds は入力の値をそのまま返すだけで丸め対象ではない。
public record SessionMetricsResult(
    double netKpm,
    double rawKpm,
    double accuracy,
    double consistency,
    int durationSeconds
) {}
