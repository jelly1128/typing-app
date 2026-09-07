package dev.kazuki.typingapp.api.entity;

/**
 * セッションの終了条件の種類(FR-05)。
 * 定数名をDBのCHECK制約・API仕様のenum値と同じ文字列にする(db-access.md 1章)。
 * Java識別子の慣例(SCREAMING_SNAKE_CASE)には従わない、意図的な選択。
 */
public enum EndConditionType {
    sentence_count,
    time_limit
}
