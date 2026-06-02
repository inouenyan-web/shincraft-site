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
| `BUFFER_ACCESS_TOKEN` | Instagram投稿（Buffer経由） | Buffer → Settings → Apps → Access Token |
| `BUFFER_INSTAGRAM_PROFILE_ID` | Bufferの対象Instagramプロファイルのid | 下記「Buffer設定」参照 |
| `FAL_KEY` | AI動画生成（fal.ai image-to-video） | 下記「fal.ai設定」参照 |

## 2. ネットワーク許可ホスト（重要）

> fal.ai を使う場合は `fal.run` と `queue.fal.run` の許可も必要です（下記参照）。

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
- `fal.run`, `queue.fal.run`, `gateway.ai.cloudflare.com` … fal.ai 動画生成API

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

## 5. Buffer設定（Instagram投稿）

### 5-1. Bufferアカウント準備
1. [buffer.com](https://buffer.com) にサインアップ（無料プランで可）
2. Instagram Business アカウントをBufferに接続（Channels → Connect）
3. Settings → Apps → Access Token を発行

### 5-2. プロファイルIDの取得
```bash
curl "https://api.bufferapp.com/1/profiles.json?access_token=<YOUR_TOKEN>"
# レスポンス中の service=instagram の "id" フィールドを BUFFER_INSTAGRAM_PROFILE_ID に設定
```

### 5-3. 環境変数を登録
| 変数名 | 値 |
|---|---|
| `BUFFER_ACCESS_TOKEN` | Step 5-1で取得したAccess Token |
| `BUFFER_INSTAGRAM_PROFILE_ID` | Step 5-2で取得したInstagramプロファイルID |

### 5-4. ネットワーク許可ホスト追加
`api.bufferapp.com` … Buffer Publish API

### 5-5. 動作確認
```bash
cd ai-sns-automation && node scripts/post_to_buffer.mjs --dry-run
```

---

## 6. fal.ai設定（Instagram Reel AI動画生成）

### 6-1. APIキーの取得
1. [fal.ai](https://fal.ai) にサインアップ / ログイン
2. 右上メニュー → **Settings → API Keys**
3. **「Create new key」** をクリックしてAPIキーを発行
4. 表示されたキー（`key-...`形式）を `FAL_KEY` 環境変数に登録

### 6-2. 環境変数を登録
| 変数名 | 値 |
|---|---|
| `FAL_KEY` | fal.aiで発行したAPIキー |

### 6-3. ネットワーク許可ホスト追加
```
fal.run
queue.fal.run
```

### 6-4. 動作確認
```bash
cd ai-sns-automation && npm install
# 設定確認（APIを呼ばない）
node scripts/generate_ai_video.mjs POST-001 --dry-run

# 実行（台帳に管理IDが存在すること）
node scripts/generate_ai_video.mjs POST-001

# 高速モデルで実行（low cost）
node scripts/generate_ai_video.mjs POST-001 --model fast

# 画像URLを直接指定して実行
node scripts/generate_ai_video.mjs POST-001 --image-url https://example.com/image.jpg
```

---

## 7. 動作確認（全体）

```bash
cd ai-sns-automation && npm install
node scripts/ledger.mjs list                      # 台帳が読めるか
node scripts/note_to_x.mjs --dry-run              # note新着が拾えるか
node scripts/publish_approved.mjs --dry-run       # 承認行のX投稿内容確認
node scripts/post_to_buffer.mjs --dry-run         # 承認行のInstagram投稿内容確認
node scripts/generate_ai_video.mjs POST-001 --dry-run  # AI動画生成設定確認
```
