-- TBL-06 session_kana_counts.char_type にも TBL-05 miss_records.char_type と同じCHECK制約を追加する
-- (table-definition.md CL-021、コードレビューで非対称が見つかった)
ALTER TABLE session_kana_counts
    ADD CONSTRAINT session_kana_counts_char_type_check
    CHECK (char_type IN ('清音', '拗音', '撥音ん', '促音っ', '長音'));
