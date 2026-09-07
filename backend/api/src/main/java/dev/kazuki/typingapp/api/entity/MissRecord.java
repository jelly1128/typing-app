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

/** TBL-05 miss_records(ミス記録・キー単位のイベント、FR-04/FR-10)。1回の誤入力=1行。 */
@Entity
@Table(name = "miss_records")
public class MissRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @Column(nullable = false)
    private Integer kanaOccurrenceNo;

    @Column(nullable = false, length = 4)
    private String kana;

    @Column(nullable = false, length = 10)
    private String expectedKey;

    @Column(nullable = false, length = 10)
    private String actualKey;

    @Column(length = 4)
    private String prevKana;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CharType charType;

    protected MissRecord() {}

    public MissRecord(
            Session session,
            Integer kanaOccurrenceNo,
            String kana,
            String expectedKey,
            String actualKey,
            String prevKana,
            CharType charType) {
        this.session = session;
        this.kanaOccurrenceNo = kanaOccurrenceNo;
        this.kana = kana;
        this.expectedKey = expectedKey;
        this.actualKey = actualKey;
        this.prevKana = prevKana;
        this.charType = charType;
    }

    public Long getId() {
        return id;
    }

    public Session getSession() {
        return session;
    }

    public Integer getKanaOccurrenceNo() {
        return kanaOccurrenceNo;
    }

    public String getKana() {
        return kana;
    }

    public String getExpectedKey() {
        return expectedKey;
    }

    public String getActualKey() {
        return actualKey;
    }

    public String getPrevKana() {
        return prevKana;
    }

    public CharType getCharType() {
        return charType;
    }
}
