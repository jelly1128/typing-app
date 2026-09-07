package dev.kazuki.typingapp.api.repository;

/** {@link MissRecordRepository#countByExpectedAndActualKey} の戻り値(db-access.md 4.3)。 */
public interface ErrorPatternCountProjection {
    String getExpectedKey();

    String getActualKey();

    Long getCount();
}
