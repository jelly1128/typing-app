package dev.kazuki.typingapp.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** TBL-04 sessions(セッション結果、FR-05〜09)。 */
@Entity
@Table(name = "sessions")
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_set_id", nullable = false)
    private TopicSet topicSet;

    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal netKpm;

    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal rawKpm;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal accuracy;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal consistency;

    @Column(nullable = false)
    private Integer durationSeconds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EndConditionType endConditionType;

    @Column(nullable = false)
    private Integer endConditionValue;

    @Column(nullable = false)
    private LocalDateTime playedAt;

    protected Session() {}

    public Session(
            User user,
            TopicSet topicSet,
            BigDecimal netKpm,
            BigDecimal rawKpm,
            BigDecimal accuracy,
            BigDecimal consistency,
            Integer durationSeconds,
            EndConditionType endConditionType,
            Integer endConditionValue) {
        this.user = user;
        this.topicSet = topicSet;
        this.netKpm = netKpm;
        this.rawKpm = rawKpm;
        this.accuracy = accuracy;
        this.consistency = consistency;
        this.durationSeconds = durationSeconds;
        this.endConditionType = endConditionType;
        this.endConditionValue = endConditionValue;
        this.playedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public TopicSet getTopicSet() {
        return topicSet;
    }

    public BigDecimal getNetKpm() {
        return netKpm;
    }

    public BigDecimal getRawKpm() {
        return rawKpm;
    }

    public BigDecimal getAccuracy() {
        return accuracy;
    }

    public BigDecimal getConsistency() {
        return consistency;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public EndConditionType getEndConditionType() {
        return endConditionType;
    }

    public Integer getEndConditionValue() {
        return endConditionValue;
    }

    public LocalDateTime getPlayedAt() {
        return playedAt;
    }
}
