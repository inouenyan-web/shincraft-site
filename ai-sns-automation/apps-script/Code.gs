// ShinCRAFT SNS自動投稿 — Apps Script JSON API
// =====================================================================
// 役割: Claude Codeなどの外部スクリプトから、投稿管理台帳(Google Sheets)を
//       読み書きするための薄いJSON API. サービスアカウント不要.
//
// 対応アクション(POST body):
//   { token, action: "list",   sheet }                         -> 全行をオブジェクト配列で返す
//   { token, action: "append", sheet, values:{列名:値,...} }     -> 1行追加
//   { token, action: "update", sheet, keyColumn, keyValue,
//            updates:{列名:値,...} }                            -> 該当行の指定列を更新
//   { token, action: "post_to_x", text }                       -> Xへツイート投稿
//   { token, action: "note_to_x", noteUrl, noteTitle }         -> note記事をXへシェア投稿
//   旧Yoom互換: action未指定 + fileId/fileName/fileUrl があれば従来の追記を実行
//
// セキュリティ:
//   - Web App URL は実質ベアラーシークレット. SHARED_TOKEN と一致しない要求は拒否する.
//   - SHARED_TOKEN はスクリプトプロパティに保存する(コードに直書きしない).
//     プロジェクトの設定 > スクリプトプロパティ に SHARED_TOKEN を登録すること.
//   - X API認証情報もスクリプトプロパティに保存する:
//     X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
//
// デプロイ:
//   デプロイ > 新しいデプロイ > ウェブアプリ
//   実行ユーザー: 自分 / アクセス: 全員
//   ※コード変更時は「デプロイを管理」から既存デプロイを編集すればURLは維持される.
// =====================================================================

const SPREADSHEET_ID = '1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s';
const DEFAULT_SHEET = '投稿管理';
const NOTE_SHEET = 'note連携';

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
      case 'post_to_x':
        if (!req.text) throw new Error('textが必要です。');
        return json_(postToXAction_(req.text));
      case 'note_to_x':
        if (!req.noteUrl) throw new Error('noteUrlが必要です。');
        return json_(noteToXAction_(req.noteUrl, req.noteTitle || ''));
      default:
        throw new Error('未知のaction: ' + action);
    }
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

// ── X投稿アクション ──────────────────────────────────────────────

function postToXAction_(text) {
  const xUrl = postTweet_(text);
  return { ok: true, xPostUrl: xUrl };
}

function noteToXAction_(noteUrl, noteTitle) {
  // 重複チェック（note連携シートに既投稿のURLがあればスキップ）
  try {
    const rows = listRows_(NOTE_SHEET);
    const alreadyPosted = rows.some(function(r) { return r['link'] === noteUrl; });
    if (alreadyPosted) return { ok: true, status: 'duplicate', message: '既にX投稿済みです。', noteUrl: noteUrl };
  } catch (e) {
    // シート未作成時は無視して続行
  }

  const template = 'noteに新しい記事を投稿しました📝\n{title}\n{link}';
  const text = template
    .replace('{title}', noteTitle || '')
    .replace('{link}', noteUrl)
    .trim();

  const xUrl = postTweet_(text);

  // 投稿記録をnote連携シートへ保存
  try {
    appendRow_(NOTE_SHEET, {
      guid: noteUrl,
      title: noteTitle || '',
      link: noteUrl,
      postedAt: new Date().toISOString(),
      xPostUrl: xUrl,
    });
  } catch (e) {
    // シート未作成なら記録はスキップ（投稿自体は成功）
  }

  return { ok: true, status: 'posted', xPostUrl: xUrl, noteUrl: noteUrl };
}

// X API v2 OAuth 1.0a でツイートを投稿し、投稿URLを返す
function postTweet_(text) {
  const props = PropertiesService.getScriptProperties();
  const apiKey    = props.getProperty('X_API_KEY');
  const apiSecret = props.getProperty('X_API_SECRET');
  const accessToken  = props.getProperty('X_ACCESS_TOKEN');
  const accessSecret = props.getProperty('X_ACCESS_SECRET');

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error('X APIキーがスクリプトプロパティに未設定です。SETUP_SECRETS.mdを参照してください。');
  }

  const endpoint = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text: text });
  const method = 'POST';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Utilities.base64Encode(
    Utilities.newBlob(Math.random().toString() + timestamp).getBytes()
  ).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);

  const oauthParams = {
    oauth_consumer_key:     apiKey,
    oauth_nonce:            nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        timestamp,
    oauth_token:            accessToken,
    oauth_version:          '1.0',
  };

  const paramStr = Object.keys(oauthParams).sort().map(function(k) {
    return encodeURIComponent_(k) + '=' + encodeURIComponent_(oauthParams[k]);
  }).join('&');

  const signatureBase = method + '&' + encodeURIComponent_(endpoint) + '&' + encodeURIComponent_(paramStr);
  const signingKey = encodeURIComponent_(apiSecret) + '&' + encodeURIComponent_(accessSecret);

  const signatureBytes = Utilities.computeHmacSignature(
    Utilities.MacAlgorithm.HMAC_SHA_1, signatureBase, signingKey
  );
  oauthParams.oauth_signature = Utilities.base64Encode(signatureBytes);

  const authHeader = 'OAuth ' + Object.keys(oauthParams).map(function(k) {
    return encodeURIComponent_(k) + '="' + encodeURIComponent_(oauthParams[k]) + '"';
  }).join(', ');

  const response = UrlFetchApp.fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    payload: body,
    muteHttpExceptions: true,
  });

  const statusCode = response.getResponseCode();
  const result = JSON.parse(response.getContentText());
  if (statusCode !== 201 || !result.data || !result.data.id) {
    throw new Error('X API エラー ' + statusCode + ': ' + JSON.stringify(result));
  }
  return 'https://x.com/i/web/status/' + result.data.id;
}

// RFC3986準拠のエンコード（GAS標準のencodeURIComponentは一部記号を変換しない）
function encodeURIComponent_(str) {
  return encodeURIComponent(String(str)).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  });
}

// ── 認証・既存ヘルパー ───────────────────────────────────────────

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

function createManagementId_(now) {
  const tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
  return 'SNS-' + Utilities.formatDate(now, tz, 'yyyyMMdd-HHmmss');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
