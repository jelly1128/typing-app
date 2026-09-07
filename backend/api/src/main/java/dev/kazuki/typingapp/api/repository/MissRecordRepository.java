package dev.kazuki.typingapp.api.repository;

import dev.kazuki.typingapp.api.entity.MissRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** TBL-05 miss_records(db-access.md 4.3)。 */
public interface MissRecordRepository extends JpaRepository<MissRecord, Long> {

    /**
     * 「拍単位ミス集合」を1本のネイティブクエリで取得する(db-access.md 4.3)。同じ拍への複数回ミスは
     * (session_id, kana, kana_occurrence_no)の組でDISTINCT ONし重複除去する。JPQLではDISTINCT ONを
     * 表現できないためネイティブクエリにしている。
     */
    @Query(
            value =
                    """
                    SELECT DISTINCT ON (mr.session_id, mr.kana, mr.kana_occurrence_no)
                        mr.kana AS kana,
                        mr.prev_kana AS prevKana,
                        mr.char_type AS charType
                    FROM miss_records mr
                    JOIN sessions s ON s.id = mr.session_id
                    WHERE s.user_id = :userId
                    ORDER BY mr.session_id, mr.kana, mr.kana_occurrence_no, mr.id
                    """,
            nativeQuery = true)
    List<MissUnitProjection> findDistinctMissUnitsByUserId(@Param("userId") Long userId);

    /** 誤りパターン別発生回数(FR-10(2))。こちらは拍単位ではなく生イベント単位(db-access.md 4.3)。 */
    @Query(
            """
            SELECT mr.expectedKey AS expectedKey,
                   mr.actualKey AS actualKey,
                   COUNT(mr) AS count
            FROM MissRecord mr
            JOIN mr.session s
            WHERE s.user.id = :userId
            GROUP BY mr.expectedKey, mr.actualKey
            """)
    List<ErrorPatternCountProjection> countByExpectedAndActualKey(@Param("userId") Long userId);
}
