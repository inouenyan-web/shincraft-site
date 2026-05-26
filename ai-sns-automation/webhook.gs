// ShinCRAFT SNS自動投稿 Webhook受信用スクリプト
// YoomはGoogle Driveの新規ファイル検知とWebhook POSTのみを担当し、
// 以降のロジックは本スクリプトに集約します。

const WEBHOOK_SPREADSHEET_ID = '1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s';
const WEBHOOK_SHEET_NAME = '投稿管理';

const COLUMN_NAMES = {
  MANAGEMENT_ID: '管理ID',
  REGISTERED_AT: '登録日',
  PRODUCT_NAME: '商品名',
  POST_CATEGORY: '投稿カテゴリ',
  SOURCE_IMAGE_URL: '元画像URL',
  STATUS: 'ステータス',
  ERROR_MESSAGE: 'エラー内容'
};

const FIXED_VALUES = {
  POST_CATEGORY: '商品紹介',
  STATUS: '未確認'
};

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('POSTボディが空です。JSONを送信してください。');
    }

    const payload = parseJson_(e.postData.contents);
    validatePayload_(payload);

    const managementId = createManagementId_();
    const now = new Date();

    const sheet = SpreadsheetApp.openById(WEBHOOK_SPREADSHEET_ID).getSheetByName(WEBHOOK_SHEET_NAME);
    if (!sheet) {
      throw new Error('シートが見つかりません: ' + WEBHOOK_SHEET_NAME);
    }

    const headerMap = getHeaderMap_(sheet);
    const rowValues = buildRowValues_(headerMap, {
      managementId,
      registeredAt: now,
      productName: payload.fileName,
      sourceImageUrl: payload.fileUrl
    });

    sheet.appendRow(rowValues);
    const rowNumber = sheet.getLastRow();

    return jsonResponse_({
      ok: true,
      managementId,
      rowNumber
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error.message
    });
  }
}

function parseJson_(raw) {
  try {
    return JSON.parse(raw);
  } catch (_) {
    throw new Error('JSONの解析に失敗しました。形式を確認してください。');
  }
}

function validatePayload_(payload) {
  const required = ['fileId', 'fileName', 'fileUrl'];
  required.forEach(key => {
    if (!payload[key] || String(payload[key]).trim() === '') {
      throw new Error('必須項目が不足しています: ' + key);
    }
  });

  if (!/^https?:\/\//.test(String(payload.fileUrl))) {
    throw new Error('fileUrlはhttp/https形式で指定してください。');
  }

  if (payload.createdTime !== undefined && String(payload.createdTime).trim() !== '') {
    const created = new Date(payload.createdTime);
    if (isNaN(created.getTime())) {
      throw new Error('createdTimeは日時として解釈できる値を指定してください。');
    }
  }
}

function createManagementId_() {
  const now = new Date();
  const tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
  const datePart = Utilities.formatDate(now, tz, 'yyyyMMdd');
  const timePart = Utilities.formatDate(now, tz, 'HHmmss');
  return 'SNS-' + datePart + '-' + timePart;
}

function getHeaderMap_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    throw new Error('ヘッダー行が存在しません。');
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const map = {};
  headers.forEach((name, index) => {
    if (name) map[name] = index;
  });

  const requiredHeaders = Object.values(COLUMN_NAMES);
  requiredHeaders.forEach(name => {
    if (map[name] === undefined) {
      throw new Error('必要な列が見つかりません: ' + name);
    }
  });

  return {
    headers,
    indexByName: map
  };
}

function buildRowValues_(headerMap, input) {
  const row = new Array(headerMap.headers.length).fill('');
  const set = (name, value) => {
    row[headerMap.indexByName[name]] = value;
  };

  set(COLUMN_NAMES.MANAGEMENT_ID, input.managementId);
  set(COLUMN_NAMES.REGISTERED_AT, input.registeredAt);
  set(COLUMN_NAMES.PRODUCT_NAME, input.productName);
  set(COLUMN_NAMES.POST_CATEGORY, FIXED_VALUES.POST_CATEGORY);
  set(COLUMN_NAMES.SOURCE_IMAGE_URL, input.sourceImageUrl);
  set(COLUMN_NAMES.STATUS, FIXED_VALUES.STATUS);
  set(COLUMN_NAMES.ERROR_MESSAGE, '');

  return row;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
