package dev.kazuki.typingapp.api.repository;

import dev.kazuki.typingapp.api.entity.TopicSet;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** TBL-02 topic_sets(db-access.md 4.1)。 */
public interface TopicSetRepository extends JpaRepository<TopicSet, Long> {

    /** お題セット一覧(FR-13)。画面の表示順そのまま。 */
    List<TopicSet> findAllByOrderBySortOrder();
}
