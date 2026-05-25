# Codex作業指示書：ShinCRAFT SNS自動投稿 初期構築

## 目的

Google Driveの `AI` フォルダ配下にSNS自動投稿用の初期構成を作り、以後のYoom / Buffer / ChatGPT連携の土台を整える。

## 現在あるファイル

- `ai-sns-automation/setup.gs`
- `ai-sns-automation/README.md`

## Codexにやってほしいこと

### 1. Apps Scriptのレビュー

`setup.gs` を確認し、以下をチェックする。

- Google DriveのAIフォルダIDが正しく定数化されているか
- フォルダ作成が冪等になっているか
- スプレッドシート作成が重複しないか
- ステータスのデータ入力規則が正しく設定されているか
- 例外処理・ログ出力を追加すべき箇所がないか

### 2. セットアップ手順の改善

READMEに、非エンジニアでもわかる実行手順を追加する。

特に以下を明記する。

- Google Apps Scriptをどこから開くか
- setup.gsを貼る場所
- 実行関数名
- 初回権限許可の流れ
- 実行後に確認すべきDrive / Sheets

### 3. 次段階の実装ファイルを作る

以下の設計ファイルを追加する。

- `YOOOM_FLOW_SPEC.md`
- `BUFFER_API_SPEC.md`
- `OPENAI_IMAGE_PROMPT.md`
- `OPENAI_CAPTION_PROMPT.md`
- `MOBILE_OPERATION_MANUAL.md`

### 4. 秘密情報の扱い

以下は絶対にGitHubに保存しない。

- OpenAI APIキー
- Buffer APIキー
- Yoomの認証情報
- Google OAuthトークン

必要な場合は `.env.example` のみ作成する。

## 最終目標

ユーザーの日常作業を以下だけにする。

1. Android / iPadでGoogle Driveの `01_投稿待ち` に写真を入れる
2. Google Sheetsで投稿案を確認する
3. 問題なければステータスを `承認` にする
4. Bufferで投稿済み確認
