# square-automation — Square カタログ一括操作

Square Dashboard の画面操作（全選択→一括編集）は **ブラウザ自動化が脆く、ログイン維持や
ダッシュボードCDNの広い通信許可が必要** なため見送り、**Square Catalog API による
一括更新スクリプト**で運用する。依存パッケージはゼロ（Node 22+ の `fetch` / `crypto` のみ）。

## できること

- 全アイテムの「オンラインで販売」を一括ON（`scripts/set_items_online.mjs`）
  - `ecom_visibility = VISIBLE`（Square Online サイトで表示・購入可）
  - `available_online = true`（レガシーのオンライン販売フラグ）
  - read-modify-write で**他項目（名称・バリエーション・ロケーション設定）は壊さない**

## 前提（井上さん側で用意するもの）

### 1. ネットワーク許可（環境作成時のみ設定可）
> ⚠️ 既定ポリシーでは `connect.squareup.com` は **403 で遮断**される（実測済み）。
> 環境を作り直す際に、許可リストへ以下を追加すること。**セッション内からは変更できない。**

| ホスト | 用途 |
|---|---|
| `connect.squareup.com` | 本番 Catalog API |
| `connect.squareupsandbox.com` | 検証（Sandbox）を使う場合 |

### 2. 環境変数

| 変数名 | 必須 | 用途 |
|---|---|---|
| `SQUARE_ACCESS_TOKEN` | ✅ | Catalog API トークン。スコープ `ITEMS_READ` + `ITEMS_WRITE` |
| `SQUARE_ENV` | 任意 | `prod`（既定）/ `sandbox` |
| `SQUARE_VERSION` | 任意 | 指定時のみ `Square-Version` ヘッダを送出（未指定ならトークン既定版） |
| `SQUARE_LOCATION_ID` | 任意 | 将来のロケーション別操作用（本スクリプトでは未使用） |

トークンは Square Developer Dashboard のアプリ、または個人用アクセストークンから発行。
**秘密情報は Git に保存せず、環境変数で渡す。**

## 使い方

```bash
cd square-automation

# 1) まず dry-run（変更対象の件数と現状値を表示するだけ。書き込みなし）
node scripts/set_items_online.mjs

# 2) 少数で検証（先頭5件だけ実適用）
node scripts/set_items_online.mjs --limit 5 --apply

# 3) 問題なければ全件適用
node scripts/set_items_online.mjs --apply
```

### オプション
- `--apply` … 実適用（無ければ dry-run）
- `--limit N` … 先頭N件だけ対象（段階適用の検証用）
- `--no-ecom-visible` … `ecom_visibility=VISIBLE` を設定しない
- `--no-available-online` … `available_online=true` を設定しない

## 推奨手順

1. `SQUARE_ENV=sandbox` でも一度 dry-run し、取得・対象判定が動くことを確認。
2. 本番で **dry-run → `--limit 5 --apply`（少数検証）→ `--apply`（全件）** の順に進める。
3. 「オンラインで販売」トグルが店舗でどのフィールドに対応するかは構成差があるため、
   少数検証後に実際の Square 側表示を確認してから全件適用する。

## 設計メモ

- 取得: `POST /v2/catalog/search-catalog-objects`（`object_types:["ITEM"]`、カーソルでページング）
- 更新: `POST /v2/catalog/batch-upsert-catalog-objects`（200件ずつ、`idempotency_key` 付き）
- 楽観ロック: 各オブジェクトの `version` をそのまま付けて送る（競合時はSquardがエラー）
- リトライ: 429 / 5xx は指数バックオフ（2s,4s,8s,16s）
