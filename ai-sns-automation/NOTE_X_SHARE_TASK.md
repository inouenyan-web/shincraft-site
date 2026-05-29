# note → X シェア作業指示書

## 実行対象

- noteアカウント: `oshin_2026`（URL: https://note.com/oshin_2026）
- Xアカウント: `@honeo_honeo`
- 今日の作業: 記事 #11 を投稿後、#12〜#15 を連続シェア

---

## Claude Codeが処理できない理由（委譲の根拠）

このClaudeセッションでは `note.com` / `api.x.com` への通信がすべて 403 でブロックされている。
SETUP_SECRETS.md に記載の通り、ネットワークポリシーはセッション内では変更不可。

→ **DELEGATION.md に従いYoom（第1委譲先）へエスカレーション。**  
→ Yoom未対応なら **Chrome版Claude（最終手段）** で画面操作。

---

## 方法A：Yoom（推奨）

### 前提
- YoomにXチャネル（@honeo_honeo）の連携が設定済みであること
- YoomにX投稿アクションが使えること

### Yoomフロー設定

**フロー名**: `note記事→X投稿（手動トリガー）`

| 設定項目 | 値 |
|---|---|
| トリガー | 手動トリガー（または Webhook POST） |
| 入力変数 | `note_url`（記事URL）、`note_title`（記事タイトル） |
| アクション | X投稿 |
| 投稿文 | `{{note_title}} を投稿しました。\n{{note_url}}\n#note #oshin2026` |
| 投稿先 | @honeo_honeo |

### 実行手順

1. note.com/oshin_2026 を開き、記事 #11 のURL とタイトルをコピー
2. Yoomのフローを開いて手動トリガーを起動
3. `note_url` と `note_title` を入力して実行
4. X投稿を確認
5. 同様に #12〜#15 を繰り返す

---

## 方法B：Chrome版Claude（Yoom未対応時の最終手段）

### 手順

1. **note.com で記事情報を取得**
   - https://note.com/oshin_2026 を開く
   - 記事 #11 を開く
   - タイトルと記事URLをコピー（URLは `https://note.com/oshin_2026/n/n...` の形式）

2. **X投稿文を作成**
   ```
   [記事タイトルを1文で言い換えた要約]
   #note #oshin2026
   https://note.com/oshin_2026/n/[記事ID]
   ```
   - 140字以内に収める
   - 要約はタイトルと記事冒頭から作成

3. **x.com に投稿**
   - https://x.com にログイン（@honeo_honeo）
   - 投稿文をペーストして投稿

4. **#12〜#15 も同様に繰り返す**

---

## 方法C：新しいClaudeセッション（根本解決）

新しいClaude Code Webセッションを作成する際に以下を設定する：

### 必要なネットワーク許可ホスト
- `note.com`
- `api.x.com`
- `api.twitter.com`
- `script.google.com`
- `script.googleusercontent.com`

### 必要な環境変数
| 変数名 | 値 |
|---|---|
| `NOTE_USERNAME` | `oshin_2026` |
| `X_API_KEY` | X Developer Portalで取得 |
| `X_API_SECRET` | 同上 |
| `X_ACCESS_TOKEN` | @honeo_honeo のアクセストークン |
| `X_ACCESS_SECRET` | 同上 |
| `GAS_WEBAPP_URL` | Apps ScriptのデプロイURL |
| `GAS_SHARED_TOKEN` | Apps Scriptのシークレットトークン |

### 実行
```bash
cd ai-sns-automation && npm install
node scripts/note_to_x.mjs --dry-run   # 対象確認（#11が表示されるか）
node scripts/note_to_x.mjs             # 実投稿
```

記事を1件ずつ指定してポストするには `--url` オプションを使う（実装済み）：
```bash
# 記事#11を直接URL指定でXへ投稿
node scripts/note_to_x.mjs --url https://note.com/oshin_2026/n/n[記事ID] --title "[記事タイトル]"

# #12〜#15 も同様
node scripts/note_to_x.mjs --url https://note.com/oshin_2026/n/n[記事ID] --title "[記事タイトル]"
```

---

## 参照
- 実装スクリプト: `ai-sns-automation/scripts/note_to_x.mjs`
- 環境変数設定: `ai-sns-automation/SETUP_SECRETS.md`
- 委譲ポリシー: `ai-sns-automation/DELEGATION.md`
