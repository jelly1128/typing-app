package dev.kazuki.typingapp.api.repository;

import dev.kazuki.typingapp.api.entity.Sentence;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** TBL-03 sentences(db-access.md 4.1)。 */
public interface SentenceRepository extends JpaRepository<Sentence, Long> {

    /** お題文一覧(FR-01)。第2ソートキーidでタイブレークし順序を確定させる。 */
    List<Sentence> findByTopicSetIdOrderById(Long topicSetId);
}
