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
import jakarta.persistence.UniqueConstraint;

/** TBL-06 session_kana_counts(セッション内のかな1拍別総出現回数、FR-10)。 */
@Entity
@Table(
        name = "session_kana_counts",
        uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "kana"}))
public class SessionKanaCount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @Column(nullable = false, length = 4)
    private String kana;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CharType charType;

    @Column(nullable = false)
    private Integer totalCount;

    protected SessionKanaCount() {}

    public SessionKanaCount(Session session, String kana, CharType charType, Integer totalCount) {
        this.session = session;
        this.kana = kana;
        this.charType = charType;
        this.totalCount = totalCount;
    }

    public Long getId() {
        return id;
    }

    public Session getSession() {
        return session;
    }

    public String getKana() {
        return kana;
    }

    public CharType getCharType() {
        return charType;
    }

    public Integer getTotalCount() {
        return totalCount;
    }
}
