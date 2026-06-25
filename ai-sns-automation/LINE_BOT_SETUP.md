# LINE受注ボット セットアップ手順

LINEで受注・売上を話しかけると ShinCRAFT受注シートに自動登録されます。

---

## 必要なもの（全部 一度きり）

| 何 | 誰が操作 | 時間 |
|---|---|---|
| LINE Developers でチャンネル作成 | 井上さん | 5分 |
| GAS 新規プロジェクト作成 | 井上さん / コワーク | 5分 |
| スクリプトプロパティ設定 | 井上さん / コワーク | 3分 |
| GAS デプロイ | 井上さん | 2分 |
| LINE Webhook URL の設定 | 井上さん / コワーク | 2分 |

---

## STEP 1 — LINE Developers でチャンネルを作成

### 1-1. LINE Developers にログイン

1. **https://developers.line.biz/** を開く
2. 右上「ログイン」→ **LINEアカウントでログイン**（shincraft2023@gmail.com ではなく、ShinCRAFTで使っているLINEアカウント）

### 1-2. プロバイダーを作成

3. 「プロバイダー」→「作成」→ プロバイダー名：**ShinCRAFT** → 作成

### 1-3. Messaging API チャンネルを作成

4. プロバイダー画面で「チャンネルを作成」→「Messaging API」
5. 以下を入力：
   - チャンネルの種類：Messaging API
   - チャンネル名：**ShinCRAFT秘書**
   - チャンネル説明：**受注管理ボット（社内専用）**
   - 業種：小売業
   - メールアドレス：shincraft2023@gmail.com
6. 利用規約に同意 → 作成

### 1-4. トークンを取得

7. 作成されたチャンネルの「Messaging API設定」タブを開く
8. 「チャンネルアクセストークン（長期）」の「発行」をクリック → コピーして保存
9. 「基本設定」タブ → 「チャンネルシークレット」をコピーして保存

---

## STEP 2 — GAS 新規プロジェクトを作成

1. **https://script.google.com** を開く（Googleアカウントでログイン）
2. 「新しいプロジェクト」→ プロジェクト名：**ShinCRAFT受注ボット**
3. 既存の `function myFunction(){}` を**全部削除**する
4. リポジトリの `ai-sns-automation/apps-script/line_juchu_bot.gs` の内容を**コピーして貼り付け**
5. 保存（Ctrl+S）

---

## STEP 3 — スクリプトプロパティを設定

1. GAS エディタの「プロジェクトの設定」（歯車アイコン）を開く
2. 「スクリプトプロパティ」→「プロパティを追加」で以下の3つを登録：

| プロパティ名 | 値 |
|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | STEP 1-4 で取得したチャンネルアクセストークン |
| `LINE_CHANNEL_SECRET` | STEP 1-4 で取得したチャンネルシークレット |
| `ANTHROPIC_API_KEY` | AnthropicのAPIキー（別途取得・Claude Code環境変数と同じ値） |

3. 保存

---

## STEP 4 — GAS をデプロイ

1. GAS エディタ右上「デプロイ」→「新しいデプロイ」
2. 種類の選択：「ウェブアプリ」
3. 説明：「LINE受注ボット v1」
4. 実行ユーザー：**自分**
5. アクセスできるユーザー：**全員**
6. 「デプロイ」をクリック → Googleのアクセス承認ダイアログが出たら「許可」
7. 発行されたウェブアプリのURL（`https://script.google.com/macros/s/xxx/exec`）をコピー

---

## STEP 5 — LINE Webhook URL を設定

1. LINE Developers → ShinCRAFT秘書チャンネル → 「Messaging API設定」タブ
2. 「Webhook URL」欄に STEP 4 のURLを貼り付け
3. 「更新」→「検証」をクリック（「成功」と出ればOK）
4. 「Webhookの利用」をオンにする
5. 「応答メッセージ」を**オフ**にする（自動応答をボットに任せるため）

---

## STEP 6 — ボットを友だち追加

1. LINE Developers → 「Messaging API設定」→ QRコードが表示されている
2. スマホのLINEでQRコードを読み取り → 「ShinCRAFT秘書」を友だち追加

---

## 動作テスト

LINEで「ShinCRAFT秘書」に以下を送信：

```
田中さんから多用途スタンド小 1個 3000円 直納
```

→ 確認メッセージが返ってくる → 「OK」と返信 → 受注シートに追加される

---

## 使い方（日常）

```
# 個別受注
田中さんから名入れキーホルダー3個 5000円 来週金曜納品

# イベント出店売上
宝塚ワンニャンフェス 売上70000円 現金

# コンサル
BIVコンサル料 77000円 振込

# 入力できるもの（順不同・自然文でOK）
顧客名・商品名・詳細・数量・金額・発送方法・納期・支払方法
```

---

## トラブル時

- **返信が来ない** → GAS のログを確認（実行 → ログ）
- **「受注内容が読み取れません」が連続する** → ANTHROPIC_API_KEY を確認
- **受注シートに追加されない** → スプレッドシートIDを確認（`JUCHU_SHEET_ID`定数）

---

*コード: `ai-sns-automation/apps-script/line_juchu_bot.gs`*
*最終更新: Claude Code 2026-06-15*
