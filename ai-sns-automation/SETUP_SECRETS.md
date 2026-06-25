# SETUP_SECRETS.md — 環境変数とネットワーク設定

秘密情報は **Git に保存しない**。Claude Code Web環境の **「環境変数」設定** に登録する。
`.env.example` は項目名の控えのみ。

## 1. 登録する環境変数

> **登録先の違い（重要）**
> - **Claude Code 環境変数**：セッション実行時（`/sns` 等）に使う変数。Claude Code Webの「環境変数」設定から登録。
> - **GitHub Secrets**：GitHub Actions（毎朝チェック・IG→LINEミラー等）で使う変数。リポジトリ Settings → Secrets → Actions から登録。
> - ★ LINE_CHANNEL_ACCESS_TOKEN は `/sns` 用に Claude Code 環境変数へ。IG→LINE自動ミラー（Actions）用に GitHub Secrets にも登録（両方）。
> - ★ META_ACCESS_TOKEN は GitHub Secrets にも登録が必要（8章参照）。

| 変数名 | 用途 | 登録先 | 取得元 |
|---|---|---|---|
| `X_API_KEY` | X投稿（OAuth1.0a App Key） | Claude Code | X Developer Portal |
| `X_API_SECRET` | X投稿（App Secret） | Claude Code | 同上 |
| `X_ACCESS_TOKEN` | X投稿（ユーザーAccess Token） | Claude Code | 同上 |
| `X_ACCESS_SECRET` | X投稿（Access Token Secret） | Claude Code | 同上 |
| `NOTE_USERNAME` | `note.com/<ここ>/rss` のユーザー名 | Claude Code | noteのプロフィールURL |
| `NOTE_X_TEMPLATE` | （任意）note→X 投稿文。`{title}` `{link}` を置換 | Claude Code | 任意 |
| `GAS_WEBAPP_URL` | 台帳API（Apps Script WebアプリURL） | Claude Code | Apps Scriptのデプロイ |
| `GAS_SHARED_TOKEN` | 台帳API認証トークン | Claude Code | 任意の長い乱数。下記参照 |
| `BUFFER_ACCESS_TOKEN` | Instagram投稿（Buffer Publish API） | Claude Code | Buffer → Settings → Access Token |
| `BUFFER_INSTAGRAM_PROFILE_ID` | Buffer上のInstagramプロファイルID | Claude Code | Buffer API `/profiles.json` で確認 |
| `ATTACH_IMAGE` | （任意）`1`で投稿時に画像添付を試みる | Claude Code | 任意 |
| `DRIVE_NOBG_FOLDER_ID` | 背景透過済み画像の保存先DriveフォルダID | Claude Code | Google Drive で `02_背景透過済み` フォルダを作成して確認 |
| `IG_USER_ID` | Instagramチェック・IG→LINEミラー（投稿取得） | **両方** | Instagram Business Account ID（下記8章） |
| `META_ACCESS_TOKEN` | Instagramチェック・IG→LINEミラー（Graph API長期トークン・**EAA形式**） | **両方** | Meta for Developers（下記8章） |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE公式アカウントへのブロードキャスト投稿 | **両方** | LINE Developers → チャンネル → Messaging API → チャンネルアクセストークン（下記10章） |
| `LINE_OWNER_USER_ID` | IG DM新着をFlexメッセージで井上さん本人にpushする（未設定なら全員ブロードキャストにフォールバック） | **両方** | LINE受注ボットに「マイID」と送ると表示される（下記10章） |
| `CHATWORK_API_TOKEN` | Chatworkのメッセージチェック（`check_inbox.mjs`） | GitHub Secrets | Chatwork → [APIトークン設定](https://www.chatwork.com/service/packages/chatwork/subpackages/api/token.php)（下記12章） |
| `GMAIL_CLIENT_ID` | Gmail受信箱チェック（`check_inbox.mjs`） | GitHub Secrets | Google Cloud Console → OAuth 2.0 クライアントID（下記12章） |
| `GMAIL_CLIENT_SECRET` | Gmail受信箱チェック | GitHub Secrets | 同上 |
| `GMAIL_REFRESH_TOKEN` | Gmail受信箱チェック（無期限トークン） | GitHub Secrets | `node scripts/gmail_oauth_setup.mjs` で取得（下記12章） |

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

### 4-1. ⚠️ 「未知のaction」エラーが出たときの最短復旧（2026-06 の教訓）

過去に、デプロイ済みGASが古い版のまま固定され、`listFolder` / `uploadFile` 等の
Drive操作アクションが反映されず `{"ok":false,"error":"未知のaction: uploadFile"}`
が返り続ける事象が発生した。スプレッドシートにバインドされたプロジェクトと、
実際にデプロイされているプロジェクトが別物になっていたのが原因。

**最短復旧手順（既存プロジェクト探しで迷ったら、新規作成が一番速い）:**

1. https://script.google.com →「新しいプロジェクト」
2. `apps-script/Code.gs` の全文を貼り付けて保存。
3. ⚙️ プロジェクトの設定 > スクリプトプロパティ に `SHARED_TOKEN` を登録
   （`GAS_SHARED_TOKEN` 環境変数と**同じ値**にする）。
4. デプロイ > 新しいデプロイ > ウェブアプリ（実行: 自分 / アクセス: 全員）。
5. 認証ダイアログはオーナー本人が承認（Claude Code / Chrome版では代行不可）。
6. 発行URLをブラウザで開き `{"ok":true,"status":"alive"}` を確認。
7. **発行URLを環境変数 `GAS_WEBAPP_URL` に更新**（← これを忘れると旧URLを叩き続ける）。

> 健康診断: `curl -sL "$GAS_WEBAPP_URL"` で `{"ok":true,"status":"alive"}` が返れば最新版。
> `Script function not found: doGet` が返るなら古い版が動いている＝再デプロイが必要。

### 4-2. 一括背景透過→Driveアップロードの全自動実行

`GAS_WEBAPP_URL` が最新版（uploadFile対応）を指していれば、以下だけで
**取り込み→背景透過→アップロードまでコピペ不要で全自動**になる:

```bash
cd ai-sns-automation
node scripts/process_photoroom.mjs --dry-run   # 対象確認
node scripts/process_photoroom.mjs             # 実処理（背景透過してDriveへ）
```

## 5. 動作確認

```bash
cd ai-sns-automation && npm install
node scripts/ledger.mjs list                      # 台帳が読めるか
node scripts/note_to_x.mjs --dry-run              # note新着が拾えるか
node scripts/publish_approved.mjs --dry-run       # 承認行のX投稿内容確認
node scripts/post_to_buffer.mjs --dry-run         # 承認行のInstagram投稿内容確認
node scripts/check_instagram.mjs                  # Instagramの投稿/コメントが取れるか
```

---

## 8. Instagram Graph API（チェック用・読み取り専用）

`node scripts/check_instagram.mjs` で @shincraft2023 の **投稿一覧・いいね/コメント数・
コメント本文（返信漏れ検出）・フォロワー数** を自動取得するために必要。
**DM受信箱は Graph API の対象外**（Messenger Platform の別審査が必要）。
未設定でも自動でChrome版Claude用プロンプトにフォールバックするため、運用は止まらない。

**前提**：Instagram を **Business または Creator** アカウントにし、Facebookページと連携しておく。

### 8-1. トークン取得手順
1. [Meta for Developers](https://developers.facebook.com) でアプリを作成（タイプ: ビジネス）。
2. アプリに製品 **「Instagram Graph API」** を追加。
3. **Graph API Explorer** で次の権限を付けたトークンを発行：
   `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`
4. **IG_USER_ID** を取得：
   - `GET /me/accounts` → 対象Facebookページの `id` を控える
   - `GET /{page-id}?fields=instagram_business_account` → `instagram_business_account.id` が `IG_USER_ID`
5. **長期トークン**へ変換（短期トークンは1〜2時間で失効）：
   - `GET /oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=短期トークン`
   - 返ってきた60日有効トークンを `META_ACCESS_TOKEN` に設定。

### 8-2. 環境変数を登録
| 変数名 | 値 |
|---|---|
| `IG_USER_ID` | 手順4で取得した数値ID |
| `META_ACCESS_TOKEN` | 手順5で取得した長期トークン |

> GitHub Actions（`.github/workflows/instagram-check.yml`）で毎朝自動実行する場合は、
> リポジトリの **Settings→Secrets and variables→Actions** にも同じ2つを登録する。
> Web実行環境はネット制限で `graph.facebook.com` に到達できないため、定期チェックはActions側で回す。

### 8-3. ネットワーク許可ホスト追加
`graph.facebook.com` … Instagram Graph API

### 8-4. 動作確認
```bash
cd ai-sns-automation && node scripts/check_instagram.mjs
```

> ⚠️ 長期トークンは60日で失効するが、下記 **9章の自動更新** を設定すれば手動再取得は不要。

---

## 9. Instagramトークンの自動更新（推奨・手動再取得を不要にする）

`.github/workflows/instagram-token-refresh.yml` が **毎月1日・15日** に長期トークンを
再交換し、GitHub Secret `META_ACCESS_TOKEN` を自動で書き換える。長期トークンは有効なうちに
再交換すると新しい60日トークンになるため、この定期実行が回り続ける限り**失効しない**。

### 9-1. 追加で必要なSecret（リポジトリ Settings→Secrets and variables→Actions）
| Secret名 | 値 | 取得元 |
|---|---|---|
| `FB_APP_ID` | Metaアプリ ID | Meta for Developers → アプリ「設定→ベーシック」 |
| `FB_APP_SECRET` | Metaアプリ シークレット | 同上（「表示」で確認） |
| `GH_PAT` | Actions Secretを更新できるGitHub PAT | 下記9-2 |

（`META_ACCESS_TOKEN` と `IG_USER_ID` は8章で登録済みのものを使う）

### 9-2. GH_PAT（GitHub Personal Access Token）の作り方
GitHub Secretは標準の `GITHUB_TOKEN` では書き換えできないため、専用PATが要る。
1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token
2. Repository access: `inouenyan-web/shincraft-site` のみに限定
3. Permissions → Repository permissions → **Secrets: Read and write** を付与
4. 有効期限は最長（1年）に設定。発行された `github_pat_...` を `GH_PAT` に登録。
   ※PATは最長1年で失効するため、年1回だけ再発行が必要（トークンの60日ごとより大幅に楽）。

### 9-3. 動作確認
Actionsタブ →「Instagramトークン自動更新」→ Run workflow。
ログに「✅ GitHub Secret『META_ACCESS_TOKEN』を更新しました」が出れば成功。

---

## 10. LINE公式アカウント連動（任意・Instagram投稿と同時配信）

`post_to_buffer.mjs` でInstagramに投稿する際、`LINE_CHANNEL_ACCESS_TOKEN` が設定されていれば
**LINE公式アカウントの全フォロワーにも同じ内容を自動ブロードキャスト**する。
設定しなければ何も起きない（スキップ）。

### 10-1. トークン取得手順
1. [LINE Developers](https://developers.line.biz/ja/) にアクセス → プロバイダー選択 or 新規作成。
2. **Messaging API チャンネル**を作成（または既存のチャンネルを選択）。
3. チャンネル設定 →「Messaging API設定」タブ →「チャンネルアクセストークン（長期）」を発行。
4. 発行されたトークンを `LINE_CHANNEL_ACCESS_TOKEN` として Claude Code 環境変数に登録。

### 10-2. 動作確認
```bash
cd ai-sns-automation
LINE_CHANNEL_ACCESS_TOKEN=your_token node scripts/post_to_buffer.mjs --dry-run
# → LINE: （本文プレビュー）が表示されれば連動設定OK
```

### 10-3. LINE本文の整形ルール
- Instagram本文からハッシュタグ行を除去して送信（LINEではハッシュタグ不要）
- 最大5000文字（LINE制限）。通常の投稿は収まる。
- 画像はLINEブロードキャストでは添付しない（テキストのみ）。
  画像を添付したい場合は Line Messaging API の `image` メッセージ型に対応が必要（要追加実装）。

### 10-4. LINE_OWNER_USER_IDの取得（IG DM承認フローに必要）

`LINE_OWNER_USER_ID` を登録すると、Instagram DM新着通知が全フォロワーへのブロードキャストの代わりに
**井上さん本人へのpush＋Flexカルーセル（承認/保留ボタン付き）** に昇格する。

**取得手順（1回だけ）：**
1. LINE受注ボット（`line_juchu_bot.gs` でデプロイしたボット）を友だち追加してトーク画面を開く。
2. **「マイID」** と送信する。
3. ボットが返信した `U...` で始まるIDをコピーする。
4. コピーしたIDを以下2か所に登録：
   - Claude Code Web環境変数 `LINE_OWNER_USER_ID`
   - GitHub Secrets `LINE_OWNER_USER_ID`（dm-check.yml の Actions用）

---

## 11. Instagram→LINE 自動ミラー（出店・イベント告知を自動配信）

井上さんが **Instagramに出店・イベント告知を投稿すると、公式LINEへ自動でブロードキャスト** する。
`/sns` を通さず、Instagramアプリから直接投稿したものも対象。GitHub Actions で30分おきにチェックする。
実装：`scripts/mirror_instagram_to_line.mjs` ／ `.github/workflows/instagram-to-line.yml`。

### 11-1. 仕組みと絞り込み
- Instagram Graph API で最新投稿を取得 → 本文に **出店・イベント告知キーワード**
  （出店／イベント／マルシェ／ポップアップ等）を含む投稿だけをLINEへ流す。
- 日常の軽い投稿を全友だちに一斉送信しないための絞り込み（キーワードは
  `mirror_instagram_to_line.mjs` の `EVENT_KEYWORDS` で調整可能）。
- 配信済み投稿IDは `data/line_mirrored.json` に記録し、重複送信を防止（Actionsが自動コミット）。

### 11-2. 必要な GitHub Secrets（リポジトリ Settings→Secrets→Actions）
| Secret名 | 用途 |
|---|---|
| `IG_USER_ID` | 投稿取得（8章で登録済み） |
| `META_ACCESS_TOKEN` | 投稿取得（**有効なEAA形式トークンが必要**・8章） |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE公式へのブロードキャスト（10章） |

> ⚠️ `META_ACCESS_TOKEN` が無効だと投稿検出ができず動かない。8章で有効なトークンを取得・登録すること。

### 11-3. 初回の誤爆防止（重要）
有効化した直後は、既存の過去投稿がまとめてLINEに流れないよう、まず一度 **seed** を実行する：
- Actionsタブ →「Instagram→LINE自動ミラー」→ Run workflow → mode=`seed`
- これで現在の最新投稿群を「配信済み」として記録だけする（送信しない）。
- 以降は、新しく投稿された告知だけがLINEへ流れる。

### 11-4. 動作確認
- Run workflow → mode=`dry-run` で、LINEへ流す対象だけを送信せず確認できる。

---

## 12. 統合受信箱チェック（Instagram DM / Chatwork / Gmail）

`check_inbox.mjs` が **直近24hのメッセージを3チャンネル同時に監視**し、
受注案件・交渉中タスクを受注管理シートへ自動追記・日次報告する。
GitHub Actions（`.github/workflows/inbox-check.yml`）が朝9時・夜9時に実行。

各チャンネルは **独立して動作**。トークン未設定のチャンネルは自動スキップするため、
揃っていないものから順次有効化できる。

### 12-1. Chatwork APIトークン取得

1. [Chatwork APIトークン設定](https://www.chatwork.com/service/packages/chatwork/subpackages/api/token.php) を開く。
2. 「APIトークン」欄のトークンをコピー。
3. リポジトリ **Settings→Secrets→Actions** に `CHATWORK_API_TOKEN` として登録。

### 12-2. Gmail OAuth2 トークン取得

Gmail は OAuth2 が必要なため、1回だけセットアップ手順を踏む。

**Google Cloud Console 側の準備（1回のみ）:**
1. [Google Cloud Console](https://console.cloud.google.com/) → プロジェクト作成（または既存）。
2. **APIs & Services → Library** で **Gmail API** を有効化。
3. **APIs & Services → OAuth consent screen** を設定：
   - User Type: 外部
   - アプリ名: ShinCRAFT（任意）
   - スコープ: `https://www.googleapis.com/auth/gmail.readonly`
   - テストユーザーに `shincraft2023@gmail.com` を追加
4. **APIs & Services → Credentials → OAuth 2.0 Client IDs を作成**：
   - アプリの種類: **デスクトップアプリ**
   - → `client_id`（`xxx.apps.googleusercontent.com`）と `client_secret`（`GOCSPX-xxx`）を取得

**GMAIL_REFRESH_TOKEN の取得（ローカルPCで1回のみ）:**
```bash
cd ai-sns-automation && npm install
GMAIL_CLIENT_ID=xxx.apps.googleusercontent.com \
GMAIL_CLIENT_SECRET=GOCSPX-xxx \
node scripts/gmail_oauth_setup.mjs
```
→ 表示されたURLをブラウザで開く → shincraft2023@gmail.com で認証 → 認証コードをコピー → ターミナルに貼り付け  
→ `GMAIL_REFRESH_TOKEN = 1//xxx...` が表示される。

**GitHub Secrets に3つ登録（Settings→Secrets→Actions）:**
| Secret名 | 値 |
|---|---|
| `GMAIL_CLIENT_ID` | `xxx.apps.googleusercontent.com` |
| `GMAIL_CLIENT_SECRET` | `GOCSPX-xxx` |
| `GMAIL_REFRESH_TOKEN` | `1//xxx...`（上記で取得した値） |

### 12-3. ネットワーク許可ホスト追加
GitHub Actions では不要（全通信許可）。Claude Code Webセッションで手動実行する場合：
- `api.chatwork.com` … Chatwork API
- `gmail.googleapis.com`, `accounts.google.com` … Gmail API / OAuth2

### 12-4. 動作確認
```bash
cd ai-sns-automation
# 書き込みせず確認だけ
CHATWORK_API_TOKEN=xxx GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx GMAIL_REFRESH_TOKEN=xxx \
node scripts/check_inbox.mjs --dry-run
```

GitHub Actions から手動実行:
Actionsタブ →「統合受信箱チェック（朝晩2回）」→ Run workflow
→ `dry-run` チェックをONにすればシートに書き込まない。

### 12-5. 受注管理シートへの追記ルール
- 確度「高」（注文/購入/発注 等のキーワード含む）→ **受注案件** として追記
- 確度「中」（見積/相談/価格/欲しい 等）→ **交渉中タスク** として追記
- 確度「低」→ 報告のみ（シートへの書き込みなし）
- 重複防止: `inbox_log` シートで fingerprint を管理し、同一メッセージを2回追記しない
