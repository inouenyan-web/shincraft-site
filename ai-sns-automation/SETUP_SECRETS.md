# SETUP_SECRETS.md — 環境変数とネットワーク設定

秘密情報は **Git に保存しない**。Claude Code Web環境の **「環境変数」設定** に登録する。
`.env.example` は項目名の控えのみ。

## 1. 登録する環境変数

| 変数名 | 用途 | 取得元 |
|---|---|---|
| `X_API_KEY` | X投稿（OAuth1.0a App Key） | X Developer Portal |
| `X_API_SECRET` | X投稿（App Secret） | 同上 |
| `X_ACCESS_TOKEN` | X投稿（ユーザーAccess Token） | 同上 |
| `X_ACCESS_SECRET` | X投稿（Access Token Secret） | 同上 |
| `NOTE_USERNAME` | `note.com/<ここ>/rss` のユーザー名 | noteのプロフィールURL |
| `NOTE_X_TEMPLATE` | （任意）note→X 投稿文。`{title}` `{link}` を置換 | 任意 |
| `GAS_WEBAPP_URL` | 台帳API（Apps Script WebアプリURL） | Apps Scriptのデプロイ |
| `GAS_SHARED_TOKEN` | 台帳API認証トークン | 任意の長い乱数。下記参照 |
| `ATTACH_IMAGE` | （任意）`1`で投稿時に画像添付を試みる | 任意 |

> Instagram自動投稿（Graph API）は当面使わないため不要。使う段階で別途追記する。

## 2. ネットワーク許可ホスト

Claude Code Web環境のネットワークポリシーで、以下への外向き通信を許可する必要がある。

- `api.x.com`, `api.twitter.com` … X投稿
- `note.com`（必要に応じ `assets.st-note.com`） … note RSS取得
- `script.google.com`, `script.googleusercontent.com` … 台帳API（Apps Script）
- `registry.npmjs.org` … `npm install`（初回の依存導入）

ポリシーの種類と設定は公式ドキュメント参照：
https://code.claude.com/docs/en/claude-code-on-the-web

## 3. X API の準備（OAuth 1.0a）

1. X Developer Portal でアプリを作成。
2. User authentication settings で **Read and Write** 権限を有効化。
3. **API Key / Secret** と **Access Token / Secret**（自分のアカウント）を発行。
4. 上記4つを環境変数に登録。
5. 2026年の新規アカウントは従量課金（約$0.01/投稿）。旧Freeティアなら月約1,500投稿まで。
6. 画像添付（media upload）は事前に1件テスト投稿で動作確認する。

## 4. Apps Script 台帳API の準備

1. `apps-script/Code.gs` を Apps Script プロジェクトに貼り付け。
2. **プロジェクトの設定 > スクリプトプロパティ** に `SHARED_TOKEN`（長い乱数）を登録。
3. デプロイ > 新しいデプロイ > ウェブアプリ（実行: 自分 / アクセス: 全員）。
4. 発行された URL を `GAS_WEBAPP_URL`、手順2の値を `GAS_SHARED_TOKEN` に登録。
5. 「note連携」シート（列: `guid` `title` `link` `postedAt` `xPostUrl`）を作成しておくと
   note→X の重複防止記録が残る（無い場合、初回は空として動作）。
6. コード更新時は「デプロイを管理」から既存デプロイを編集すればURLは維持される。

## 5. 動作確認

```bash
cd ai-sns-automation && npm install
node scripts/ledger.mjs list            # 台帳が読めるか
node scripts/note_to_x.mjs --dry-run    # note新着が拾えるか
node scripts/publish_approved.mjs --dry-run   # 承認行の投稿内容
```
