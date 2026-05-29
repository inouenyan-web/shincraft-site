# YOOOM_THIN_TRIGGER

## 方針
Yoom側は「Driveで新規ファイルを検知してWebhookに渡すだけ」にします。列変換・判定ロジックは持たせません。

## 最小構成手順
1. **トリガー**: Google Drive の「特定フォルダでファイル作成」を選択
2. **監視対象フォルダID**: `17BVeGqN2A7Kj_ppMxGXz-Nejim7UQj0j`（`01_投稿待ち`）
3. **アクション**: HTTP/Webhook のPOST送信を追加
4. **送信先URL**: Apps Script WebアプリURL（`WEBHOOK_SETUP.md` で発行したURL）
5. **ヘッダー**: `Content-Type: application/json`
6. **Body(JSON)** を以下で設定

```json
{
  "fileId": "{{Drive File ID}}",
  "fileName": "{{Drive File Name}}",
  "fileUrl": "{{Drive File URL}}",
  "createdTime": "{{Drive Created Time}}"
}
```

> ※ プレースホルダ名はYoom側の実際の項目名に合わせて選択してください。

## 運用ルール
- Yoomは検知と転送のみ
- 分岐、整形、台帳列マッピングはApps Scriptで実施
- 仕様変更はYoomではなくCodexで `webhook.gs` を修正
