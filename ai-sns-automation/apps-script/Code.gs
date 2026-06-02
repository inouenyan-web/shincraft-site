// ShinCRAFT SNS自動投稿 — Apps Script JSON API
// =====================================================================
// 役割: Claude Codeなどの外部スクリプトから、投稿管理台帳(Google Sheets)と
//       Driveファイルを読み書きするための薄いJSON API. サービスアカウント不要.
//
// 対応アクション(POST body):
//   { token, action: "list",   sheet }                         -> 全行をオブジェクト配列で返す
//   { token, action: "append", sheet, values:{列名:値,...} }     -> 1行追加
//   { token, action: "update", sheet, keyColumn, keyValue,
//            updates:{列名:値,...} }                            -> 該当行の指定列を更新
//   { token, action: "ensureSheet", sheet, headers:[...] }      -> シートが無ければ作成
//   { token, action: "setupSheet" }                            -> 必須列を補完
//   { token, action: "listFolder", folderId }                  -> フォルダ内の画像一覧
//   { token, action: "getFileBase64", fileId }                 -> ファイルをbase64で取得
//   { token, action: "uploadFile", folderId, fileName, base64, mimeType } -> アップロード
//   旧Yoom互換: action未指定 + fileId/fileName/fileUrl があれば従来の追記を実行
//
// セキュリティ:
//   - Web App URL は実質ベアラーシークレット. SHARED_TOKEN と一致しない要求は拒否する.
//   - SHARED_TOKEN はスクリプトプロパティに保存する(コードに直書きしない).
//     プロジェクトの設定 > スクリプトプロパティ に SHARED_TOKEN を登録すること.
//
// デプロイ:
//   デプロイ > 新しいデプロイ > ウェブアプリ
//   実行ユーザー: 自分 / アクセス: 全員
//   ※コード変更時は「デプロイを管理」から既存デプロイを編集すればURLは維持される.
// =====================================================================

const SPREADSHEET_ID = '1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s';
const DEFAULT_SHEET = '投稿管理';

// 生死確認用。ブラウザでURLを開くと {ok:true,status:"alive"} が返る。
function doGet(e) {
  return json_({ ok: true, status: 'alive' });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('POSTボディが空です。JSONを送信してください。');
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
      case 'setupSheet':
        return json_(setupSheet_());
      case 'listFolder':
        return json_({ ok: true, files: listFolder_(req.folderId) });
      case 'getFileBase64':
        return json_({ ok: true, base64: getFileBase64_(req.fileId), mimeType: getFileMimeType_(req.fileId) });
      case 'uploadFile':
        return json_(uploadFile_(req.folderId, req.fileName, req.base64, req.mimeType || 'image/png'));
      default:
        throw new Error('未知のaction: ' + action);
    }
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function assertToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN');
  if (!expected) throw new Error('サーバー側にSHARED_TOKENが未設定です。');
  if (!token || token !== expected) throw new Error('認証に失敗しました。');
}

// 旧Yoomペイロード(fileId等)を受け取ったらappendとして扱う
function inferLegacyAction_(req) {
  if (req.fileId || req.fileName || req.fileUrl) return 'append';
  throw new Error('actionが指定されていません。');
}

function legacyValues_(req) {
  if (!req.fileName || !req.fileUrl) throw new Error('必須項目が不足しています(fileName/fileUrl)。');
  return {
    '商品名': req.fileName,
    '元画像URL': req.fileUrl,
  };
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

function appendRow_(sheetName, values) {
  const sheet = getSheet_(sheetName);
  const headers = getHeaders_(sheet);
  const now = new Date();

  // 投稿管理シートは管理ID/登録日/ステータスを自動補完する
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

// シートが無ければヘッダー付きで作成する。あれば何もしない（冪等）。
function ensureSheet_(sheetName, headers) {
  if (!sheetName) throw new Error('sheetが必要です。');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    return { ok: true, status: 'exists', sheet: sheetName };
  }
  sheet = ss.insertSheet(sheetName);
  if (headers && headers.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return { ok: true, status: 'created', sheet: sheetName, headers: headers };
}

// --- セットアップ ---

function setupSheet_() {
  var sheet = getSheet_(DEFAULT_SHEET);
  var headers = getHeaders_(sheet);
  var added = [];
  var required = ['背景透過画像URL'];
  required.forEach(function(col) {
    if (headers.indexOf(col) < 0) {
      sheet.getRange(1, headers.length + 1).setValue(col);
      headers.push(col);
      added.push(col);
    }
  });
  return { ok: true, added: added, message: added.length > 0 ? '列を追加しました: ' + added.join(', ') : '列は既に存在します' };
}

// --- Drive 操作 ---

function listFolder_(folderId) {
  if (!folderId) throw new Error('folderIdが必要です。');
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  var result = [];
  while (files.hasNext()) {
    var file = files.next();
    var mime = file.getMimeType();
    if (mime.indexOf('image/') === 0) {
      result.push({
        id: file.getId(),
        name: file.getName(),
        mimeType: mime,
        url: file.getUrl(),
        size: file.getSize(),
      });
    }
  }
  return result;
}

function getFileBase64_(fileId) {
  if (!fileId) throw new Error('fileIdが必要です。');
  var bytes = DriveApp.getFileById(fileId).getBlob().getBytes();
  return Utilities.base64Encode(bytes);
}

function getFileMimeType_(fileId) {
  if (!fileId) throw new Error('fileIdが必要です。');
  return DriveApp.getFileById(fileId).getMimeType();
}

function uploadFile_(folderId, fileName, base64, mimeType) {
  if (!folderId || !fileName || !base64) throw new Error('folderId/fileName/base64 が必要です。');
  var bytes = Utilities.base64Decode(base64);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);
  var folder = DriveApp.getFolderById(folderId);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { ok: true, fileId: file.getId(), url: file.getUrl(), name: file.getName() };
}

function createManagementId_(now) {
  const tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
  return 'SNS-' + Utilities.formatDate(now, tz, 'yyyyMMdd-HHmmss');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
