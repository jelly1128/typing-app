package dev.kazuki.typingapp.api.repository;

import java.math.BigDecimal;

/** {@link SessionRepository#findPersonalBest} の戻り値(db-access.md 4.2)。 */
public interface PersonalBestProjection {
    BigDecimal getNetKpmBest();

    BigDecimal getAccuracyBest();
}
