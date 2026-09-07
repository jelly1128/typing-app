package dev.kazuki.typingapp.api.repository;

/** {@link SessionKanaCountRepository#sumTotalCountByKana} の戻り値(db-access.md 4.3)。 */
public interface KanaTotalCountProjection {
    String getKana();

    Long getTotalCount();
}
