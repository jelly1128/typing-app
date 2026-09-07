-- TBL-01 users(利用者、FR-12)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- TBL-02 topic_sets(お題セット/難易度、FR-13)
CREATE TABLE topic_sets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    sort_order INT NOT NULL
);

-- TBL-03 sentences(お題文、FR-01/FR-13)
CREATE TABLE sentences (
    id BIGSERIAL PRIMARY KEY,
    topic_set_id BIGINT NOT NULL REFERENCES topic_sets(id),
    text VARCHAR(200) NOT NULL,
    mora_list JSONB NOT NULL
);

-- TBL-04 sessions(セッション結果、FR-05〜09)
CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    topic_set_id BIGINT NOT NULL REFERENCES topic_sets(id),
    net_kpm NUMERIC(6, 2) NOT NULL,
    raw_kpm NUMERIC(6, 2) NOT NULL,
    accuracy NUMERIC(5, 2) NOT NULL,
    consistency NUMERIC(8, 2) NOT NULL,
    duration_seconds INT NOT NULL,
    end_condition_type VARCHAR(20) NOT NULL CHECK (end_condition_type IN ('sentence_count', 'time_limit')),
    end_condition_value INT NOT NULL,
    played_at TIMESTAMP NOT NULL DEFAULT now()
);

-- TBL-05 miss_records(ミス記録・キー単位のイベント、FR-04/FR-10)
CREATE TABLE miss_records (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id),
    kana_occurrence_no INT NOT NULL,
    kana VARCHAR(4) NOT NULL,
    expected_key VARCHAR(10) NOT NULL,
    actual_key VARCHAR(10) NOT NULL,
    prev_kana VARCHAR(4),
    char_type VARCHAR(10) NOT NULL CHECK (char_type IN ('清音', '拗音', '撥音ん', '促音っ', '長音'))
);

-- TBL-06 session_kana_counts(セッション内のかな1拍別総出現回数、FR-10)
CREATE TABLE session_kana_counts (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id),
    kana VARCHAR(4) NOT NULL,
    char_type VARCHAR(10) NOT NULL,
    total_count INT NOT NULL,
    UNIQUE (session_id, kana)
);

-- インデックス設計(db-access.md 6章)
CREATE INDEX idx_sessions_user_played ON sessions (user_id, played_at DESC);
CREATE INDEX idx_sessions_user_topicset ON sessions (user_id, topic_set_id);
CREATE INDEX idx_miss_records_session ON miss_records (session_id);
CREATE INDEX idx_sentences_topicset ON sentences (topic_set_id);
