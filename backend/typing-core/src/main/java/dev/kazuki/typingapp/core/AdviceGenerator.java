package dev.kazuki.typingapp.core;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public final class AdviceGenerator {

    // 文字種別の同率タイブレーク順(logic-spec/advice-generation.md 2章)。
    private static final List<String> CHAR_TYPE_ORDER =
        List.of("清音", "拗音", "撥音ん", "促音っ", "長音");

    private AdviceGenerator() {
    }

    public static List<String> generate(MissAnalysisInput input) {
        if (input.byKana().isEmpty()
                && input.byErrorPattern().isEmpty()
                && input.byCharType().isEmpty()) {
            return List.of();
        }

        List<String> result = new ArrayList<>();

        // カテゴリ1: 誤りパターン(最も具体的で対処しやすい)。
        if (!input.byErrorPattern().isEmpty()) {
            ErrorPatternStat top = input.byErrorPattern().get(0);
            if (top.count() >= 3) {
                result.add(
                    ("\"%s\"を\"%s\"と入力してしまうミスが目立ちます(直近の集計で%d回)。"
                        + "次にこの組み合わせが出たら意識してみましょう。")
                        .formatted(top.expectedKey(), top.actualKey(), top.count())
                );
            }
        }

        // カテゴリ2: かな別ミス。
        if (!input.byKana().isEmpty()) {
            KanaMissStat top = input.byKana().get(0);
            if (top.missCount() >= 2
                    && top.missRate() >= 30
                    && top.occurrenceCount() >= 5) {
                result.add(
                    ("「%s」のミスが多いです(ミス率%d%%)。"
                        + "この文字を含む単語を重点的に練習してみましょう。")
                        .formatted(top.kana(), Math.round(top.missRate()))
                );
            }
        }

        // カテゴリ3: 文字種別正解率。同率は清音/拗音/撥音ん/促音っ/長音の定義順で優先する。
        if (!input.byCharType().isEmpty()) {
            CharTypeStat worst = input.byCharType().stream()
                .min(
                    Comparator.comparingDouble(CharTypeStat::accuracyRate)
                        .thenComparingInt(
                            s -> CHAR_TYPE_ORDER.indexOf(s.charType())
                        )
                )
                .orElseThrow();
            if (worst.accuracyRate() < 80 && worst.occurrenceCount() >= 5) {
                result.add(
                    "%sの正解率が%d%%とやや低めです。%sを含むお題を選んで練習すると効果的です。"
                        .formatted(
                            worst.charType(),
                            Math.round(worst.accuracyRate()),
                            worst.charType()
                        )
                );
            }
        }

        if (result.isEmpty()) {
            result.add("目立った苦手は見つかりませんでした。この調子で練習を続けましょう。");
        }

        return result;
    }
}
