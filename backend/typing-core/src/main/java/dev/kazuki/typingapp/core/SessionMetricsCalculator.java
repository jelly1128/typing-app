package dev.kazuki.typingapp.core;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class SessionMetricsCalculator {

    private SessionMetricsCalculator() {
    }

    public static SessionMetricsResult calculate(
            SessionMetricsInput input) {
        int totalKeyCount =
            input.correctKeyCount() + input.missRecordCount();

        // durationSeconds=0(制限時間モードで1打鍵も無いまま終了)は
        // 0除算を避けて既定値0を返す。100などにしないのは、後続の
        // 正常なセッションが必ず上回れるようにするため(自己ベスト汚染防止)。
        double netKpm = input.durationSeconds() == 0
            ? 0.0
            : (double) input.correctKeyCount()
                / input.durationSeconds() * 60;

        double rawKpm = input.durationSeconds() == 0
            ? 0.0
            : (double) totalKeyCount
                / input.durationSeconds() * 60;

        // 総キー入力数=0(durationSeconds>0はありうる)も同じ理由で既定値0。
        double accuracy = totalKeyCount == 0
            ? 0.0
            : (double) input.correctKeyCount()
                / totalKeyCount * 100;

        double consistency =
            calculateConsistency(input.keystrokeIntervalsMs());

        return new SessionMetricsResult(
            round(netKpm),
            round(rawKpm),
            round(accuracy),
            round(consistency),
            input.durationSeconds()
        );
    }

    // 打鍵間隔[ms]の母標準偏差(要素数で割る。標本標準偏差ではない)。
    // 全打鍵がそのまま母集団であり、標本から推定する状況ではないため。
    private static double calculateConsistency(
            int[] keystrokeIntervalsMs) {
        if (keystrokeIntervalsMs.length < 2) {
            return 0.0;
        }

        double mean = 0.0;
        for (int interval : keystrokeIntervalsMs) {
            mean += interval;
        }
        mean /= keystrokeIntervalsMs.length;

        double variance = 0.0;
        for (int interval : keystrokeIntervalsMs) {
            variance += Math.pow(interval - mean, 2);
        }
        variance /= keystrokeIntervalsMs.length;

        return Math.sqrt(variance);
    }

    // HALF_UP丸めはBigDecimal経由で1回だけ行う(呼び出し元での二重丸めを避ける)。
    // double同士の直接比較・丸めは誤差が乗りやすいため。
    private static double round(double value) {
        return BigDecimal.valueOf(value)
            .setScale(2, RoundingMode.HALF_UP)
            .doubleValue();
    }
}
