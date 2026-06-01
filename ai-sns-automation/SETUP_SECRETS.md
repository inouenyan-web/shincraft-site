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
| `DRIVE_NOBG_FOLDER_ID` | 背景透過済み画像の保存先DriveフォルダID | Google Drive で `02_背景透過済み` フォルダを作成して確認 |
| `BUFFER_ACCESS_TOKEN` | Instagram投稿（Buffer経由） | Buffer → Settings → Apps → Access Token |
| `BUFFER_INSTAGRAM_PROFILE_ID` | Bufferの対象Instagramプロファイルのid | 下記「Buffer設定」参照 |

## 2. ネットワーク許可ホスト（重要）

> ⚠️ **既定の制限ポリシーでは note / X / Google への通信がブロックされる。**
> 検証したところ、許可されるのは `registry.npmjs.org` 等の開発用ホストのみで、
> `note.com` も `api.x.com` も `script.google.com` も 403 になった。
> **必ず下記ホストを許可するカスタム許可リスト（または全許可）ポリシーで環境を作成すること。**
> この設定はセッション内からは変更できず、**環境作成時にしか選べない**。

Claude Code Web環境のネットワークポリシーで、以下への外向き通信を許可する：

- `api.x.com`, `api.twitter.com` … X投稿
- `note.com`（必要に応じ `assets.st-note.com`） … note RSS取得
- `script.google.com`, `script.googleusercontent.com` … 台帳API（Apps Script）
- `registry.npmjs.org` … `npm install`（初回の依存導入）

ポリシーの種類と設定は公式ドキュメント参照：
https://code.claude.com/docs/en/claude-code-on-the-web

### 切り分けコマンド（403が出たとき）
```bash
# 各ホストに到達できるか確認（200=許可 / 403=ポリシーで遮断の可能性）
for h in registry.npmjs.org note.com api.x.com script.google.com example.com; do \
  printf "%-24s " "$h"; curl -sS -o /dev/null -w "HTTP %{http_code}\n" --max-time 10 "https://$h"; done
# example.com まで403なら相手側ではなくネットワークポリシーの遮断。
```

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

## 5. 背景透過 定期実行（GitHub Actions）の準備

GitHub Actions で1時間ごとの自動処理を動かすには、GitHub リポジトリの
**Settings > Secrets and variables > Actions** に以下を登録する：

| Secret名 | 値 |
|---|---|
| `GAS_WEBAPP_URL` | Apps Script Web アプリのURL |
| `GAS_SHARED_TOKEN` | 台帳API認証トークン |
| `DRIVE_NOBG_FOLDER_ID` | `02_背景透過済み` フォルダのID |

登録後、GitHub の **Actions タブ > 背景透過バッチ > Run workflow** で手動テスト実行できる。

その後は毎時0分（UTC）= 日本時間 毎時9分に自動実行される。

また、Google Sheets の「投稿管理」シートに **`背景透過画像URL`** 列を追加する必要がある。

---

## 6. Buffer設定（Instagram投稿）

### 6-1. Bufferアカウント準備
1. [buffer.com](https://buffer.com) にサインアップ（無料プランで可）
2. Instagram Business アカウントをBufferに接続（Channels → Connect）
3. Settings → Apps → Access Token を発行

### 6-2. プロファイルIDの取得
```bash
curl "https://api.bufferapp.com/1/profiles.json?access_token=<YOUR_TOKEN>"
# レスポンス中の service=instagram の "id" フィールドを BUFFER_INSTAGRAM_PROFILE_ID に設定
```

### 6-3. 環境変数を登録
| 変数名 | 値 |
|---|---|
| `BUFFER_ACCESS_TOKEN` | Step 6-1で取得したAccess Token |
| `BUFFER_INSTAGRAM_PROFILE_ID` | Step 6-2で取得したInstagramプロファイルID |

### 6-4. ネットワーク許可ホスト追加
`api.bufferapp.com` … Buffer Publish API

### 6-5. 動作確認
```bash
cd ai-sns-automation && node scripts/post_to_buffer.mjs --dry-run
```

---

## 7. 動作確認（全体）

```bash
cd ai-sns-automation && npm install
node scripts/ledger.mjs list                      # 台帳が読めるか
node scripts/note_to_x.mjs --dry-run              # note新着が拾えるか
node scripts/publish_approved.mjs --dry-run       # 承認行のX投稿内容確認
node scripts/post_to_buffer.mjs --dry-run         # 承認行のInstagram投稿内容確認
```
