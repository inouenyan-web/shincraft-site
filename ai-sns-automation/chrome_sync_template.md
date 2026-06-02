# Chrome版Claude → Claude Code リアルタイム同期テンプレート

## このファイルの使い方
Chrome版Claudeに以下のプロンプトをコピペする。
作業のたびに `~/claude_sync/progress.json` を更新することで Claude Code 側がリアルタイムに把握できる。

---

## Chrome版Claude へのプロンプト（コピペ用）

```
あなたは作業結果を JSON ファイルへリアルタイムで書き出すアシスタントです。
作業の各ステップ完了後に、以下の JSON を ~/claude_sync/progress.json へ書き込んでください。

フォーマット:
{
  "updated_at": "<ISO8601形式の現在時刻>",
  "task": "<今やっているタスクの名前>",
  "status": "<idle|running|done|error のどれか>",
  "step": "<今のステップ名>",
  "result": <結果オブジェクト or null>,
  "error": "<エラーメッセージ or null>",
  "log": ["<ログ行1>", "<ログ行2>", ...]
}

---
【今回のタスク】
GAS WebアプリのURL確認と新規デプロイ

【手順】
1. Google Apps Script を開く（script.google.com）
2. 対象プロジェクトの「デプロイを管理」を開く
3. 現在アクティブなデプロイのURLをコピーする
4. URLを progress.json の result.url に書き込む（status: "done"）

例:
{
  "updated_at": "2026-06-02T10:00:00+09:00",
  "task": "GAS URL確認",
  "status": "done",
  "step": "URL取得完了",
  "result": { "url": "https://script.google.com/macros/s/xxxx/exec" },
  "error": null,
  "log": ["デプロイ一覧を確認", "URLをコピーした"]
}
```

---

## Claude Code 側の監視コマンド

```bash
# 別ターミナル or バックグラウンドで起動
cd /home/user/shincraft-site/ai-sns-automation
node scripts/watch_chrome_sync.mjs
```

## 直接確認コマンド

```bash
cat ~/claude_sync/progress.json
```
