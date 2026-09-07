package dev.kazuki.typingapp.api.entity;

/**
 * かな1拍の文字種(romaji-automaton.md 2章の5分類)。
 * 定数名をDBのCHECK制約・API仕様のenum値と同じ文字列にする(db-access.md 1章)。
 */
public enum CharType {
    清音,
    拗音,
    撥音ん,
    促音っ,
    長音
}
