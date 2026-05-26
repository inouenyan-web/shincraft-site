// ShinCRAFT SNS自動投稿 Drive定期巡回スクリプト
// Yoom / Webhook / Google Cloudを使わず、Apps Scriptの時間主導トリガーで
// Google Driveの「01_投稿待ち」を巡回し、Google Sheets「投稿管理」へ登録します。

const DRIVE_POLLING_CONFIG = {
  SPREADSHEET_ID: '1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s',
  SHEET_NAME: '投稿管理',
  PENDING_FOLDER_ID: '17BVeGqN2A7Kj_ppMxGXz-Nejim7UQj0j',
  PROCESSED_FOLDER_ID: '10b7YcJykmsPm9BcQEP-pUM2ZMvYNLu3i',
  ERROR_FOLDER_ID: '12-Wgy-eD0hOaEd8-9Ftk1cg7AjH7b2RS',
  PROCESSED_PROPERTY_PREFIX: 'DRIVE_POLLING_PROCESSED_FILE_',
  TRIGGER_FUNCTION_NAME: 'pollPendingDriveImages',
  TRIGGER_INTERVAL_MINUTES: 5
};

const DRIVE_POLLING_COLUMNS = {
  MANAGEMENT_ID: '管理ID',
  REGISTERED_AT: '登録日',
  PRODUCT_NAME: '商品名',
  POST_CATEGORY: '投稿カテゴリ',
  SOURCE_IMAGE_URL: '元画像URL',
  STATUS: 'ステータス',
  ERROR_MESSAGE: 'エラー内容'
};

function pollPendingDriveImages() {
  const pendingFolder = DriveApp.getFolderById(DRIVE_POLLING_CONFIG.PENDING_FOLDER_ID);
  const files = pendingFolder.getFiles();
  const processedFileIds = getProcessedFileIds_();

  while (files.hasNext()) {
    const file = files.next();
    const fileId = file.getId();

    if (!isImageFile_(file)) {
      continue;
    }

    if (processedFileIds[fileId]) {
      markFileProcessed_(fileId);
      moveFileToProcessedFolder_(file);
      continue;
    }

    try {
      if (isFileAlreadyRegistered_(fileId)) {
        markFileProcessed_(fileId);
        moveFileToProcessedFolder_(file);
        continue;
      }

      appendDriveFileToPostManagement_(file);
      markFileProcessed_(fileId);
      moveFileToProcessedFolder_(file);
    } catch (error) {
      try {
        moveFileToErrorFolder_(file, error);
      } catch (moveError) {
        Logger.log('[ERROR] エラーフォルダ移動にも失敗: ' + file.getName() + ' / ' + moveError.message);
      }
      Logger.log('[ERROR] 登録失敗: ' + file.getName() + ' / ' + error.message);
    }
  }
}

function setupDrivePollingTrigger() {
  deleteDrivePollingTriggers();

  ScriptApp.newTrigger(DRIVE_POLLING_CONFIG.TRIGGER_FUNCTION_NAME)
    .timeBased()
    .everyMinutes(DRIVE_POLLING_CONFIG.TRIGGER_INTERVAL_MINUTES)
    .create();
}

function deleteDrivePollingTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === DRIVE_POLLING_CONFIG.TRIGGER_FUNCTION_NAME) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function getProcessedFileIds_() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const processed = {};
  const prefix = DRIVE_POLLING_CONFIG.PROCESSED_PROPERTY_PREFIX;

  Object.keys(props).forEach(key => {
    if (key.indexOf(prefix) === 0) {
      processed[key.substring(prefix.length)] = props[key];
    }
  });

  return processed;
}

function markFileProcessed_(fileId) {
  const key = DRIVE_POLLING_CONFIG.PROCESSED_PROPERTY_PREFIX + fileId;
  PropertiesService.getScriptProperties().setProperty(key, new Date().toISOString());
}

function isFileAlreadyRegistered_(fileId) {
  const key = DRIVE_POLLING_CONFIG.PROCESSED_PROPERTY_PREFIX + fileId;
  if (PropertiesService.getScriptProperties().getProperty(key)) {
    return true;
  }

  const sheet = getPostManagementSheet_();
  const headerMap = getDrivePollingHeaderMap_(sheet);
  const imageUrlColumnIndex = headerMap.indexByName[DRIVE_POLLING_COLUMNS.SOURCE_IMAGE_URL] + 1;
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return false;
  }

  const values = sheet.getRange(2, imageUrlColumnIndex, lastRow - 1, 1).getValues();
  return values.some(row => String(row[0]).indexOf(fileId) !== -1);
}

function appendDriveFileToPostManagement_(file) {
  const sheet = getPostManagementSheet_();
  const headerMap = getDrivePollingHeaderMap_(sheet);
  const row = new Array(headerMap.headers.length).fill('');

  setDrivePollingValue_(row, headerMap, DRIVE_POLLING_COLUMNS.MANAGEMENT_ID, createManagementId_());
  setDrivePollingValue_(row, headerMap, DRIVE_POLLING_COLUMNS.REGISTERED_AT, new Date());
  setDrivePollingValue_(row, headerMap, DRIVE_POLLING_COLUMNS.PRODUCT_NAME, file.getName());
  setDrivePollingValue_(row, headerMap, DRIVE_POLLING_COLUMNS.POST_CATEGORY, '商品紹介');
  setDrivePollingValue_(row, headerMap, DRIVE_POLLING_COLUMNS.SOURCE_IMAGE_URL, file.getUrl());
  setDrivePollingValue_(row, headerMap, DRIVE_POLLING_COLUMNS.STATUS, '未確認');
  setDrivePollingValue_(row, headerMap, DRIVE_POLLING_COLUMNS.ERROR_MESSAGE, '');

  sheet.appendRow(row);
  return sheet.getLastRow();
}

function moveFileToProcessedFolder_(file) {
  const processedFolder = DriveApp.getFolderById(DRIVE_POLLING_CONFIG.PROCESSED_FOLDER_ID);
  file.moveTo(processedFolder);
}

function moveFileToErrorFolder_(file, error) {
  const errorFolder = DriveApp.getFolderById(DRIVE_POLLING_CONFIG.ERROR_FOLDER_ID);
  file.setDescription('Drive polling error: ' + error.message);
  file.moveTo(errorFolder);
}

function createManagementId_() {
  const tz = Session.getScriptTimeZone() || 'Asia/Tokyo';
  return 'SNS-' + Utilities.formatDate(new Date(), tz, 'yyyyMMdd-HHmmss');
}

function getPostManagementSheet_() {
  const ss = SpreadsheetApp.openById(DRIVE_POLLING_CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(DRIVE_POLLING_CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error('シートが見つかりません: ' + DRIVE_POLLING_CONFIG.SHEET_NAME);
  }
  return sheet;
}

function getDrivePollingHeaderMap_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    throw new Error('投稿管理シートにヘッダー行がありません。');
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const indexByName = {};
  headers.forEach((header, index) => {
    if (header) {
      indexByName[String(header)] = index;
    }
  });

  Object.keys(DRIVE_POLLING_COLUMNS).forEach(key => {
    const columnName = DRIVE_POLLING_COLUMNS[key];
    if (indexByName[columnName] === undefined) {
      throw new Error('必要な列が見つかりません: ' + columnName);
    }
  });

  return { headers, indexByName };
}

function setDrivePollingValue_(row, headerMap, columnName, value) {
  row[headerMap.indexByName[columnName]] = value;
}

function isImageFile_(file) {
  const mimeType = file.getMimeType();
  return mimeType && mimeType.indexOf('image/') === 0;
}
