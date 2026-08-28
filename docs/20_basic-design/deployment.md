---
doc_id: BD-007
status: fixed
updated: 2026-08-29
---

# デプロイ構成

## 1. 方針

Render 無料枠の範囲で完結させる(`charter.md` 5章)。学習目的の個人開発であり、継続的な保守運用は前提としない(NFR-08と同じ判断、`charter.md` 6章)。

## 2. サービス構成

| サービス | Render 上の種別 | デプロイ対象 | 備考 |
|---|---|---|---|
| フロントエンド | Static Site(無料) | `frontend/`(Vite ビルド成果物 `dist/`) | インスタンス時間を消費しない。スピンダウンなし |
| バックエンド | Web Service(無料) | `backend/api/`(Spring Boot jar) | 15分無通信でスピンダウン、再起動に約1分(NFR-03で受入済み) |
| DB | Render Postgres(無料) | — | バックアップ非対応・30日+猶予14日で失効(NFR-08で受入済み) |

## 3. フロント⇔バックエンド間の通信方式

**Static Site の Rewrite ルールでバックエンドにプロキシする。** CORS 設定は行わない。

- ルール: Source `/api/*` → Destination `https://<backend-service>.onrender.com/api/*`(Render Dashboard の Static Site 設定で追加)
- ブラウザから見るとフロントエンドと同一オリジンへのリクエストになるため、Spring Boot 側に CORS 許可設定を追加する必要がない
- ローカル開発時は同じ役割を Vite の `server.proxy`(`vite.config.ts`)が担う。本番の Rewrite ルールとローカルの Vite proxy は同じ「`/api/*` を後段に委譲する」という設計を、開発環境と本番環境それぞれの機構で再現したもの

## 4. 環境変数

| 変数 | 設定先 | 値の出どころ |
|---|---|---|
| `SPRING_DATASOURCE_URL` / `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | バックエンド Web Service の環境変数 | Render Postgres の内部接続情報(Render Dashboard の Connect メニュー) |

ソースコードに接続情報をハードコードしない(NFR-06)。

## 5. デプロイ手順の概要(P2.5-06 で実施)

1. GitHub リポジトリへ push(未実施の場合はリモート作成から)
2. Render で Postgres インスタンス作成(無料)
3. Render で Web Service 作成しバックエンドをデプロイ。ビルドコマンド `mvn -f backend clean package`、起動コマンド `java -jar backend/api/target/api.jar`。環境変数に手順4の接続情報を設定
4. Render で Static Site 作成しフロントエンドをデプロイ。ビルドコマンド `npm --prefix frontend ci && npm --prefix frontend run build`、公開ディレクトリ `frontend/dist`
5. Static Site に Rewrite ルール(3章)を追加
6. 公開 URL にアクセスし、`Hello from PostgreSQL` が表示されることを確認(P2.5 完了条件)

## 6. 未決事項

- ~~フロント/バックエンドを1サービスにまとめるか分離するか~~ → 解決済み。Static Site + Web Service に分離し、Rewrite でプロキシする方式を採用(本節)
