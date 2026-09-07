package dev.kazuki.typingapp.api.repository;

/**
 * {@link MissRecordRepository#findDistinctMissUnitsByUserId} の戻り値(db-access.md 4.3)。
 * 「拍単位ミス」1件分(同じ拍への複数回ミスは重複除去済み)。charTypeは列挙型ではなくDBの生文字列のまま返す。
 */
public interface MissUnitProjection {
    String getKana();

    String getPrevKana();

    String getCharType();
}
