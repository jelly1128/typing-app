package dev.kazuki.typingapp.api.repository;

import dev.kazuki.typingapp.api.entity.SessionKanaCount;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** TBL-06 session_kana_counts(db-access.md 4.3)。 */
public interface SessionKanaCountRepository extends JpaRepository<SessionKanaCount, Long> {

    /** かな別の総出現回数(FR-10の分母)。 */
    @Query(
            """
            SELECT skc.kana AS kana,
                   SUM(skc.totalCount) AS totalCount
            FROM SessionKanaCount skc
            JOIN skc.session s
            WHERE s.user.id = :userId
            GROUP BY skc.kana
            """)
    List<KanaTotalCountProjection> sumTotalCountByKana(@Param("userId") Long userId);

    /** 文字種別の総出現回数(FR-10の分母)。 */
    @Query(
            """
            SELECT skc.charType AS charType,
                   SUM(skc.totalCount) AS totalCount
            FROM SessionKanaCount skc
            JOIN skc.session s
            WHERE s.user.id = :userId
            GROUP BY skc.charType
            """)
    List<CharTypeTotalCountProjection> sumTotalCountByCharType(@Param("userId") Long userId);
}
