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

## 3.5 共有トークンで保護する（任意・推奨）
Webアプリは「全員」公開のため、URLを知っていれば誰でもPOSTできます。共有トークンで保護できます。

1. Apps Scriptエディタで **プロジェクトの設定**（歯車）→ **スクリプト プロパティ** を開く
2. プロパティ `SHARED_TOKEN` を追加し、十分に長いランダム文字列を値に設定する
3. 同じ値を、ローカル/CI側の環境変数 `GAS_SHARED_TOKEN`（`.env.example` 参照）に設定する
4. Yoom（または呼び出し元）のWebhook本文に `token` を含める:

```json
{
  "token": "（SHARED_TOKENと同じ値）",
  "fileId": "...",
  "fileName": "...",
  "fileUrl": "..."
}
```

`SHARED_TOKEN` を設定しない限り検証はスキップされ、従来どおり動作します（後方互換）。
トークンが一致しない場合は `ok: false` と `認証に失敗しました。共有トークンが一致しません。` を返します。

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
