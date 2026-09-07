package dev.kazuki.typingapp.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** TBL-03 sentences(お題文、FR-01/FR-13)。 */
@Entity
@Table(name = "sentences")
public class Sentence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_set_id", nullable = false)
    private TopicSet topicSet;

    @Column(nullable = false, length = 200)
    private String text;

    /** 拍(モーラ)ごとに分解したかな読みの配列(romaji-automaton.md 3章)。DB上はJSONB。 */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<String> moraList;

    protected Sentence() {}

    public Long getId() {
        return id;
    }

    public TopicSet getTopicSet() {
        return topicSet;
    }

    public String getText() {
        return text;
    }

    public List<String> getMoraList() {
        return moraList;
    }
}
