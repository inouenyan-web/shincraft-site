# WEBHOOK_SETUP

## 目的
Yoomから受け取ったGoogle Driveファイル情報を、Apps ScriptのWebhook（`doPost`）で受信し、Google Sheets `投稿管理` に追記するための設定手順です。

## 1. Apps Scriptプロジェクトにコードを配置
1. [https://script.google.com](https://script.google.com) を開く
2. 対象プロジェクトを開く（新規作成でも可）
3. `ai-sns-automation/webhook.gs` の内容を新規ファイル `webhook.gs` として貼り付ける
4. 保存する

## 2. Webアプリとしてデプロイ
1. 右上の **デプロイ** → **新しいデプロイ** をクリック
2. 種類の選択で **ウェブアプリ** を選択
3. 設定:
   - 説明: `Yoom webhook receiver`（任意）
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**（Yoomから呼ぶため）
4. **デプロイ** を実行
5. 表示された **ウェブアプリURL** を控える（YoomのWebhook先URL）

## 3. 初回権限承認
1. 初回は承認ダイアログが出るので実行ユーザーで許可
2. `Drive` と `Spreadsheet` の必要権限を許可

## 4. 動作確認（任意）
`curl` でPOSTして、`ok: true` が返ることを確認します。

```bash
curl -X POST 'https://script.google.com/macros/s/xxxxxxxxxxxx/exec' \
  -H 'Content-Type: application/json' \
  -d '{
    "fileId": "test-file-id",
    "fileName": "sample.jpg",
    "fileUrl": "https://drive.google.com/file/d/test-file-id/view",
    "createdTime": "2026-05-26T10:30:00+09:00"
  }'
```

## 5. 想定レスポンス
成功時:

```json
{
  "ok": true,
  "managementId": "SNS-20260526-103000",
  "rowNumber": 2
}
```

失敗時:

```json
{
  "ok": false,
  "error": "必須項目が不足しています: fileUrl"
}
```
