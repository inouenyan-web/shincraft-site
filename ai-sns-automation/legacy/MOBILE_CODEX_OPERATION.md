# MOBILE_CODEX_OPERATION

## 目的
AndroidからCodexブラウザ版を使って、Webhook中心構成（Apps Script主軸）を保守する運用手順です。

## 1. 事前準備
- Googleアカウントにログイン済み
- GitHubアカウントにログイン済み
- Android Chrome最新版

## 2. 基本オペレーション
1. Android ChromeでCodexブラウザ版を開く
2. 対象リポジトリ `inouenyan-web/shincraft-site` を選択
3. 作業対象を明確に指示する（例: `ai-sns-automation/webhook.gsのバリデーションを追加`）
4. 変更後、差分・テスト結果・コミット内容を確認
5. 必要ならPRを作成し、反映

## 3. 変更ポリシー
- Yoomは薄く保つ（Drive検知 + Webhook送信のみ）
- 業務ロジックはApps Scriptに集約
- 画面操作支援（Claude Chrome等）は補助に限定し、実変更はCodex経由

## 4. 障害時の切り分け
1. Yoom実行履歴でWebhook POST可否を確認
2. Apps Script実行ログで `doPost` のエラーを確認
3. Google Sheets `投稿管理` に行追加されているか確認
4. 問題箇所がロジックなら `webhook.gs` をCodexで修正

## 5. セキュリティ
- APIキー/秘密情報をGitHubに保存しない
- Webhook URLの公開範囲を最小化（必要に応じて再デプロイでURL更新）
