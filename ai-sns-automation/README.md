# ShinCRAFT SNS自動投稿 初期構築ガイド（非エンジニア向け）

このフォルダは、ShinCRAFTのSNS投稿を「写真投入 → 内容確認 → 承認」だけで回せるようにするための初期設定一式です。

---

## 1. これで何ができる？

初期設定を1回実行すると、Google DriveとGoogle Sheetsに以下が自動で作られます。

- 投稿用フォルダ（投稿待ち、生成画像、投稿済みなど）
- 投稿管理台帳（ステータス管理・本文管理）
- テンプレートファイル

日常運用は以下だけです。

1. Android / iPadで `01_投稿待ち` に写真を入れる
2. Google Sheetsで投稿案を確認する
3. 問題なければステータスを `承認` にする
4. Bufferで投稿済みを確認する

---

## 2. 初回セットアップ手順（画面どおりに進めればOK）

### Step 1: Google Apps Scriptを開く

1. ブラウザで [https://script.google.com](https://script.google.com) を開く
2. Googleアカウントでログイン
3. 右上の **「新しいプロジェクト」** をクリック

### Step 2: setup.gs を貼り付ける

1. 左側のファイル一覧で `コード.gs` を開く
2. 既存の中身を全部削除
3. このリポジトリの `ai-sns-automation/setup.gs` の内容を丸ごと貼り付ける
4. 上部のプロジェクト名を `ShinCRAFT_SNS初期構築` などに変更して保存

### Step 3: 実行する関数を選ぶ

1. 画面上部の関数選択ドロップダウンで **`setupShinCraftSnsAutomation`** を選択
2. 実行（▶）をクリック

### Step 4: 初回権限を許可する

初回だけ承認画面が出ます。

1. 「承認が必要です」→ **権限を確認**
2. 利用アカウントを選択
3. 「このアプリはGoogleで確認されていません」が出た場合は
   - **詳細** をクリック
   - **（安全ではないページ）に移動** をクリック
4. Drive / Sheets のアクセス権を **許可**

### Step 5: 実行後に確認する

- Google Drive の `AI` フォルダ配下に `ShinCRAFT_SNS自動投稿` ができている
- サブフォルダ（`01_投稿待ち` など）ができている
- `SNS投稿管理台帳_Shincraft` ができている
- シート `投稿管理` の `ステータス` 列でプルダウンが使える

---

## 3. すでにある状態で再実行しても大丈夫？

はい。フォルダ・管理台帳は「既存があれば再利用」するため、重複を避ける設計です。

---

## 4. 秘密情報の扱い（重要）

以下は **絶対にGitHubへ保存しない** でください。

- OpenAI APIキー
- Buffer APIキー
- Yoom認証情報
- Google OAuthトークン

このリポジトリには、秘密値ではなく「項目名だけ」を記載します（例: `.env.example`）。

---

## 5. 次の実装で使う仕様書

このフォルダには次段階のために以下を追加しています。

- `YOOOM_FLOW_SPEC.md`
- `BUFFER_API_SPEC.md`
- `OPENAI_IMAGE_PROMPT.md`
- `OPENAI_CAPTION_PROMPT.md`
- `MOBILE_OPERATION_MANUAL.md`

## 6. Webhook中心構成への切り替え方針（Yoomを薄くする）

運用を簡素化するため、構成を以下に統一します。

- Yoom: `01_投稿待ち` の新規ファイル検知 + Apps Script WebhookへPOSTのみ
- Apps Script (`webhook.gs`): バリデーション、管理ID採番、Google Sheets追記などのロジックを集約
- 修正作業: Yoom画面ではなくCodex主軸で実施
- Claude Chrome: 画面操作の補助用途のみ

関連ドキュメント:

- `WEBHOOK_SETUP.md`（Apps Script Webアプリ化手順）
- `YOOOM_THIN_TRIGGER.md`（Yoom最小設定）
- `MOBILE_CODEX_OPERATION.md`（Android運用手順）

### 参照する固定ID

- Spreadsheet ID: `1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s`
- 監視フォルダID (`01_投稿待ち`): `17BVeGqN2A7Kj_ppMxGXz-Nejim7UQj0j`
- 生成画像保存フォルダID (`03_生成画像`): `1eVUuN8qYuHp7h0h_I13nNS6TwuiHRcT7`
- エラー確認フォルダID (`06_エラー確認`): `12-Wgy-eD0hOaEd8-9Ftk1cg7AjH7b2RS`
