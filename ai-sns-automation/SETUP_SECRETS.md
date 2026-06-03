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
| `BUFFER_ACCESS_TOKEN` | Instagram投稿（Buffer Publish API） | Buffer → Settings → Access Token |
| `BUFFER_INSTAGRAM_PROFILE_ID` | Buffer上のInstagramプロファイルID | Buffer API `/profiles.json` で確認 |
| `ATTACH_IMAGE` | （任意）`1`で投稿時に画像添付を試みる | 任意 |

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
node scripts/ledger.mjs list            # 台帳が読めるか
node scripts/note_to_x.mjs --dry-run    # note新着が拾えるか
node scripts/publish_approved.mjs --dry-run   # 承認行の投稿内容
```
