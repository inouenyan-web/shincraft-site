# GAS復旧指示（Chrome拡張へのプロンプト）

## Chrome拡張に貼るプロンプト

```
Google Apps Script のコードが壊れている可能性があります。
以下の手順で確認し、必要なら復旧してください。

【1. 現状確認】
https://script.google.com を開いて、ShinCRAFTの台帳APIプロジェクト
（最近編集したもの）を開く。Code.gs を開いて、以下を確認：
- doPost 関数が存在するか？
- 構文エラーの赤マーカーが出ていないか？
- 全体の行数はおよそ何行か？

現状を報告してください。

【2. 壊れていた場合の復旧手順】
以下の方法でコードを復旧します（長文コピペではなく、Apps Script の
Editorのメニューからスクリプトプロパティ以外をファイルごと上書きする方法）：

a. Code.gs エディタ内で Ctrl+A で全選択して削除
b. 下記のコードを3回に分けて貼り付ける：

--- パート1（ここから）---
// ShinCRAFT SNS自動投稿 — Apps Script JSON API
const SPREADSHEET_ID = '1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s';
const DEFAULT_SHEET = '投稿管理';

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('POSTボディが空です。');
    }
    const req = JSON.parse(e.postData.contents);
    assertToken_(req.token);
    const action = req.action || inferLegacyAction_(req);
    switch (action) {
      case 'list':
        return json_({ ok: true, rows: listRows_(req.sheet || DEFAULT_SHEET) });
      case 'append':
        return json_(appendRow_(req.sheet || DEFAULT_SHEET, req.values || legacyValues_(req)));
      case 'update':
        return json_(updateRow_(req.sheet || DEFAULT_SHEET, req.keyColumn, req.keyValue, req.updates || {}));
      case 'ensureSheet':
        return json_(ensureSheet_(req.sheet, req.headers || []));
      default:
        throw new Error('未知のaction: ' + action);
    }
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}
--- パート1（ここまで）---

--- パート2（ここから）---
function assertToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN');
  if (!expected) throw new Error('サーバー側にSHARED_TOKENが未設定です。');
  if (!token || token !== expected) throw new Error('認証に失敗しました。');
}
function inferLegacyAction_(req) {
  if (req.fileId || req.fileName || req.fileUrl) return 'append';
  throw new Error('actionが指定されていません。');
}
function legacyValues_(req) {
  if (!req.fileName || !req.fileUrl) throw new Error('必須項目が不足しています。');
  return { '商品名': req.fileName, '元画像URL': req.fileUrl };
}
function getSheet_(name) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error('シートが見つかりません: ' + name);
  return sheet;
}
function getHeaders_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) throw new Error('ヘッダー行が存在しません。');
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
}
function listRows_(sheetName) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(function (row) {
    const obj = {};
    headers.forEach(function (h, i) {
      if (h) obj[h] = row[i] instanceof Date ? row[i].toISOString() : row[i];
    });
    return obj;
  });
}
--- パート2（ここまで）---

--- パート3（ここから）---
function appendRow_(sheetName, values) {
  const sheet = getSheet_(sheetName);
  const headers = getHeaders_(sheet);
  const now = new Date();
  if (sheetName === DEFAULT_SHEET) {
    if (!values['管理ID']) values['管理ID'] = createManagementId_(now);
    if (!values['登録日']) values['登録日'] = now;
    if (!values['投稿カテゴリ']) values['投稿カテゴリ'] = '商品紹介';
    if (!values['ステータス']) values['ステータス'] = '未確認';
  }
  const row = headers.map(function (h) {
    return Object.prototype.hasOwnProperty.call(values, h) ? values[h] : '';
  });
  sheet.appendRow(row);
  return { ok: true, status: 'created', managementId: values['管理ID'] || null, rowNumber: sheet.getLastRow() };
}
function updateRow_(sheetName, keyColumn, keyValue, updates) {
  if (!keyColumn) throw new Error('keyColumnが必要です。');
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const keyIdx = headers.indexOf(keyColumn);
  if (keyIdx < 0) throw new Error('keyColumnが見つかりません: ' + keyColumn);
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][keyIdx]) === String(keyValue)) {
      Object.keys(updates).forEach(function (col) {
        const c = headers.indexOf(col);
        if (c >= 0) sheet.getRange(r + 1, c + 1).setValue(updates[col]);
      });
      return { ok: true, status: 'updated', rowNumber: r + 1 };
    }
  }
  throw new Error('該当行が見つかりません: ' + keyColumn + '=' + keyValue);
}
function ensureSheet_(sheetName, headers) {
  if (!sheetName) throw new Error('sheetが必要です。');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) { return { ok: true, status: 'exists', sheet: sheetName }; }
  sheet = ss.insertSheet(sheetName);
  if (headers && headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return { ok: true, status: 'created', sheet: sheetName, headers: headers };
}
function createManagementId_(now) {
  const tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
  return 'SNS-' + Utilities.formatDate(now, tz, 'yyyyMMdd-HHmmss');
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
--- パート3（ここまで）---

c. パート1〜3を順番にエディタに貼り付けたら保存（Ctrl+S）
d. 赤いエラーマーカーが消えていることを確認
e. 「デプロイ」→「デプロイを管理」→既存デプロイの「鉛筆」→「新バージョン」→「デプロイ」
f. アクセス設定「全員」になっていることを確認

作業後にデプロイのURLを報告してください。
```
