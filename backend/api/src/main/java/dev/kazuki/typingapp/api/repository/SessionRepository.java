package dev.kazuki.typingapp.api.repository;

import dev.kazuki.typingapp.api.entity.Session;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** TBL-04 sessions(db-access.md 4.1/4.2)。 */
public interface SessionRepository extends JpaRepository<Session, Long> {

    /** 履歴一覧(FR-08)。 */
    List<Session> findByUserIdOrderByPlayedAtDesc(Long userId);

    /**
     * 自己ベスト(FR-09)。netKpmBest/accuracyBestは別々のセッション由来でもよいため、
     * 2つのMAXを独立に取る(db-access.md 4.2)。0件でも両方nullを返す(存在確認は呼び出し側の責務)。
     */
    @Query(
            """
            SELECT MAX(s.netKpm) AS netKpmBest,
                   MAX(s.accuracy) AS accuracyBest
            FROM Session s
            WHERE s.user.id = :userId
              AND s.topicSet.id = :topicSetId
            """)
    PersonalBestProjection findPersonalBest(
            @Param("userId") Long userId, @Param("topicSetId") Long topicSetId);
}
