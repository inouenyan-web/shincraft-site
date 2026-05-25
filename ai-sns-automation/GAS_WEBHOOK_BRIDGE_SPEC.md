# Apps Script Webhook中継案

## 位置づけ

最初のYoomフローは、Yoom標準のGoogle DriveトリガーとGoogle Sheetsアクションだけで作る。

このApps Script中継案は、次のような問題が出た場合に使う。

- 同じDriveファイルが複数回Sheetsへ登録される
- `管理ID` の形式を安定させたい
- ファイルIDで重複チェックしたい
- 後続のOpenAI / Buffer連携で行更新が複雑になる
- Yoom側の列マッピングが増えすぎる

## 中継方式

YoomからApps Script WebアプリへWebhookで値を送る。

Yoom:

1. Google Drive `01_投稿待ち` を監視する
2. 新規ファイルの情報を取得する
3. WebhookでApps ScriptへPOSTする

Apps Script:

1. POSTされた値を検証する
2. `fileId` が既に `投稿管理` シートに存在するか確認する
3. 未登録なら1行追加する
4. 登録済みなら重複として追加しない
5. 成功/重複/エラーをJSONでYoomへ返す

## Yoomから送る値

YoomのWebhookアクションで、JSON本文に次を設定する。

```json
{
  "source": "yoom",
  "flowName": "ShinCRAFT｜01_画像受付→投稿管理登録",
  "fileId": "{{Google DriveのファイルID}}",
  "fileName": "{{Google Driveのファイル名}}",
  "fileUrl": "{{Google DriveのファイルURL}}",
  "createdTime": "{{Google Driveの作成日時}}",
  "mimeType": "{{Google DriveのMIMEタイプ}}"
}
```

実際の `{{...}}` は、Yoom画面のアウトプット挿入から選ぶ。手入力で波括弧を書くのではなく、候補から選択する。

## Apps Scriptで使う固定値

| 項目 | 値 |
|---|---|
| スプレッドシートID | `1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s` |
| シート名 | `投稿管理` |
| 初期投稿カテゴリ | `商品紹介` |
| 初期ステータス | `未確認` |

## 推奨列

現行の `投稿管理` シートには `fileId` 専用列がない。重複チェックを厳密にする場合は、将来 `DriveファイルID` 列を追加するのが望ましい。

列を増やさない場合は、`元画像URL` からファイルIDを推定するか、`補足メモ` に `DriveFileID: xxxxx` を保存する。ただし運用上は専用列の追加が分かりやすい。

推奨追加列:

```text
DriveファイルID
```

## Apps Script処理イメージ

以下は設計用のサンプル。秘密情報は含めない。

```javascript
const SPREADSHEET_ID = '1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s';
const SHEET_NAME = '投稿管理';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');
    const result = appendPostRow_(payload);
    return json_(result);
  } catch (error) {
    return json_({
      ok: false,
      status: 'error',
      message: String(error && error.message ? error.message : error)
    });
  }
}

function appendPostRow_(payload) {
  if (!payload.fileId) throw new Error('fileId is required');
  if (!payload.fileName) throw new Error('fileName is required');
  if (!payload.fileUrl) throw new Error('fileUrl is required');

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error(`Sheet not found: ${SHEET_NAME}`);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rows = sheet.getDataRange().getValues();
  const fileIdColumn = headers.indexOf('DriveファイルID');

  if (fileIdColumn >= 0) {
    const exists = rows.slice(1).some(row => row[fileIdColumn] === payload.fileId);
    if (exists) {
      return {
        ok: true,
        status: 'duplicate',
        message: 'Already registered',
        fileId: payload.fileId
      };
    }
  }

  const now = new Date();
  const managementId = Utilities.formatDate(now, 'Asia/Tokyo', "'SNS-'yyyyMMdd-HHmmss");

  const rowByHeader = {
    '管理ID': managementId,
    '登録日': now,
    '商品名': payload.fileName,
    '投稿カテゴリ': '商品紹介',
    '元画像URL': payload.fileUrl,
    '生成画像URL': '',
    'Instagram本文': '',
    'X本文': '',
    'CTA': '',
    'ハッシュタグ': '',
    '補足メモ': fileIdColumn >= 0 ? '' : `DriveFileID: ${payload.fileId}`,
    'ステータス': '未確認',
    '投稿予定日': '',
    'Buffer登録結果': '',
    'Instagram投稿URL': '',
    'X投稿URL': '',
    'エラー内容': '',
    'DriveファイルID': payload.fileId
  };

  sheet.appendRow(headers.map(header => rowByHeader[header] ?? ''));

  return {
    ok: true,
    status: 'created',
    managementId,
    fileId: payload.fileId
  };
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 成功時の戻り値

新規登録できた場合:

```json
{
  "ok": true,
  "status": "created",
  "managementId": "SNS-20260525-143012",
  "fileId": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

既に登録済みだった場合:

```json
{
  "ok": true,
  "status": "duplicate",
  "message": "Already registered",
  "fileId": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

## エラー時の戻り値

```json
{
  "ok": false,
  "status": "error",
  "message": "fileUrl is required"
}
```

## Yoom側のエラー分岐

Apps Script中継を使う場合、YoomではWebhook後に戻り値を確認する。

| 戻り値 | Yoom側の扱い |
|---|---|
| `ok = true`, `status = created` | 正常終了 |
| `ok = true`, `status = duplicate` | 正常終了。ただし必要ならログだけ残す |
| `ok = false` | エラー通知または `06_エラー確認` へ記録 |

## 拡張設計

OpenAI画像生成を追加する場合:

- `managementId`
- `fileId`
- `fileUrl`
- `productName`

を共通キーとして扱う。

Buffer投稿を追加する場合:

- 投稿前に `ステータス = 承認済み` を必須条件にする。
- 投稿後に `Buffer登録結果` と投稿URLを更新する。
- BufferのAPIキーやOAuthトークンはApps Scriptのコードに直接書かない。使う場合はApps Scriptのスクリプトプロパティ等に保存し、GitHubには保存しない。
