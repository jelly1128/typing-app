-- お題マスタ(topic_sets/sentences)のシードデータ。
-- db-access.md 7章: NFR-08(DB再作成時の復旧)のため repeatable migration(R__)で管理し、
-- DBを作り直してFlywayを実行すれば自動的に復元される。
-- sentencesはどこからもFKで参照されないためDELETE+INSERTで全件入れ替えるが、
-- topic_setsはsessions.topic_set_idから参照されるため、DELETEすると本番投入後に
-- 外部キー違反で失敗しうる。UPSERT(ON CONFLICT)にして既存行を消さずに更新する
-- (コードレビューで指摘、2026-09-07)。
DELETE FROM sentences;

INSERT INTO topic_sets (id, name, description, sort_order) VALUES
    (1, '初級', 'ひらがなの短い単語', 1),
    (2, '中級', '日常語彙、拗音・促音・撥音・長音を含む', 2),
    (3, '上級', '助詞を含む短文', 3)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

INSERT INTO sentences (topic_set_id, text, mora_list) VALUES
    (1, 'あさ', '["あ","さ"]'),
    (1, 'がっこう', '["が","っ","こ","う"]'),
    (1, 'ほんや', '["ほ","ん","や"]'),
    (1, 'けーき', '["け","ー","き"]'),
    (1, 'きゃべつ', '["きゃ","べ","つ"]'),

    (2, 'たんじょうび', '["た","ん","じょ","う","び"]'),
    (2, 'しゅくだい', '["しゅ","く","だ","い"]'),
    (2, 'きって', '["き","っ","て"]'),
    (2, 'らーめん', '["ら","ー","め","ん"]'),
    (2, 'でんしゃ', '["で","ん","しゃ"]'),

    (3, 'きょうはいいてんきです', '["きょ","う","は","い","い","て","ん","き","で","す"]'),
    (3, 'がっこうへいきましょう', '["が","っ","こ","う","へ","い","き","ま","しょ","う"]'),
    (3, 'こーひーをのみたい', '["こ","ー","ひ","ー","を","の","み","た","い"]'),
    (3, 'でんしゃでがっこうへいく', '["で","ん","しゃ","で","が","っ","こ","う","へ","い","く"]'),
    (3, 'しゃしんをとりましょう', '["しゃ","し","ん","を","と","り","ま","しょ","う"]');

-- topic_sets.id を明示INSERTしたのでシーケンスを追従させる(次回のINSERTがid衝突しないように)
SELECT setval(pg_get_serial_sequence('topic_sets', 'id'), (SELECT MAX(id) FROM topic_sets));
