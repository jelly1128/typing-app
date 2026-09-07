package dev.kazuki.typingapp.api.repository;

import dev.kazuki.typingapp.api.entity.CharType;

/** {@link SessionKanaCountRepository#sumTotalCountByCharType} の戻り値(db-access.md 4.3)。 */
public interface CharTypeTotalCountProjection {
    CharType getCharType();

    Long getTotalCount();
}
