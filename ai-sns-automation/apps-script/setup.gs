// ShinCRAFT SNS自動投稿 初期構築スクリプト
// 目的:
// Google Driveの「AI」フォルダ配下に、SNS自動投稿用のフォルダ一式とGoogle Sheets管理台帳を作成します。
// 初回実行時はGoogle Drive / Google Sheetsへのアクセス許可が必要です。

const AI_PARENT_FOLDER_ID = '1Nl5ksVJuwEuDZgyb0jr9V6Os9YLzGBcj';
const PROJECT_FOLDER_NAME = 'ShinCRAFT_SNS自動投稿';
const SPREADSHEET_NAME = 'SNS投稿管理台帳_Shincraft';

const SUB_FOLDERS = [
  '01_投稿待ち',
  '02_背景透過済み',
  '03_生成画像',
  '04_承認待ち',
  '05_投稿済み',
  '06_エラー確認',
  '99_テンプレート'
];

const HEADERS = [
  '管理ID',
  '登録日',
  '商品名',
  '投稿カテゴリ',
  '元画像URL',
  '背景透過画像URL',
  '生成画像URL',
  'Instagram本文',
  'X本文',
  'CTA',
  'ハッシュタグ',
  '補足メモ',
  'ステータス',
  '投稿予定日',
  'Buffer登録結果',
  'Instagram投稿URL',
  'X投稿URL',
  'エラー内容'
];

const STATUSES = [
  '未確認',
  '修正',
  '承認',
  '投稿予約済み',
  '投稿済み',
  'エラー'
];

function setupShinCraftSnsAutomation() {
  try {
    Logger.log('[START] setupShinCraftSnsAutomation');

    const parent = getParentFolder_();
    const projectFolder = getOrCreateFolder_(parent, PROJECT_FOLDER_NAME);

    const folders = {};
    SUB_FOLDERS.forEach(name => {
      folders[name] = getOrCreateFolder_(projectFolder, name);
    });

    const ss = createOrFindSpreadsheet_(SPREADSHEET_NAME, projectFolder);
    setupMainSheet_(ss);
    setupFolderConfigSheet_(ss, projectFolder, folders);
    setupPromptSheet_(ss);

    createTemplateFiles_(folders['99_テンプレート']);

    Logger.log('[DONE] 初期構築が完了しました。');
    Logger.log('親フォルダ: ' + projectFolder.getUrl());
    Logger.log('管理台帳: ' + ss.getUrl());
  } catch (error) {
    Logger.log('[ERROR] 初期構築に失敗しました: ' + error.message);
    throw error;
  }
}

// 「背景透過画像URL」列だけ追加する軽量セットアップ関数
// 既存データを消さずに列だけ追加したい場合はこちらを実行する
function addBgRemoveColumn() {
  const ss = SpreadsheetApp.openById('1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s');
  const sheet = ss.getSheetByName('投稿管理');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('背景透過画像URL') >= 0) {
    Logger.log('[SKIP] 背景透過画像URL列は既に存在します');
    return;
  }
  // 元画像URLの右隣に挿入
  const insertAfter = headers.indexOf('元画像URL') + 1;
  sheet.insertColumnAfter(insertAfter);
  sheet.getRange(1, insertAfter + 1).setValue('背景透過画像URL');
  sheet.getRange(1, insertAfter + 1).setFontWeight('bold').setBackground('#e8f0fe');
  Logger.log('[DONE] 背景透過画像URL列を追加しました（列' + (insertAfter + 1) + '）');
}

function getParentFolder_() {
  try {
    return DriveApp.getFolderById(AI_PARENT_FOLDER_ID);
  } catch (error) {
    throw new Error('AI親フォルダIDが無効、またはアクセス権がありません: ' + AI_PARENT_FOLDER_ID);
  }
}

function getOrCreateFolder_(parentFolder, folderName) {
  const existing = parentFolder.getFoldersByName(folderName);
  if (existing.hasNext()) {
    const folder = existing.next();
    Logger.log('[SKIP] 既存フォルダを再利用: ' + folderName);
    return folder;
  }
  Logger.log('[CREATE] フォルダを作成: ' + folderName);
  return parentFolder.createFolder(folderName);
}

function createOrFindSpreadsheet_(spreadsheetName, targetFolder) {
  const existingFiles = targetFolder.getFilesByName(spreadsheetName);
  while (existingFiles.hasNext()) {
    const file = existingFiles.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
      Logger.log('[SKIP] 既存スプレッドシートを再利用: ' + spreadsheetName);
      return SpreadsheetApp.openById(file.getId());
    }
  }

  Logger.log('[CREATE] スプレッドシートを作成: ' + spreadsheetName);
  const ss = SpreadsheetApp.create(spreadsheetName);
  const file = DriveApp.getFileById(ss.getId());
  file.moveTo(targetFolder);
  return ss;
}

function setupMainSheet_(ss) {
  const sheetName = '投稿管理';
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName, 0);
  }
  sheet.clear();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);

  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#e8f0fe');

  sheet.autoResizeColumns(1, HEADERS.length);

  const statusColumn = HEADERS.indexOf('ステータス') + 1;
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUSES, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, statusColumn, 1000, 1).setDataValidation(rule);

  const dateColumn = HEADERS.indexOf('登録日') + 1;
  sheet.getRange(2, dateColumn, 1000, 1).setNumberFormat('yyyy/mm/dd hh:mm');

  const postDateColumn = HEADERS.indexOf('投稿予定日') + 1;
  sheet.getRange(2, postDateColumn, 1000, 1).setNumberFormat('yyyy/mm/dd hh:mm');
}

function setupFolderConfigSheet_(ss, projectFolder, folders) {
  const sheetName = 'フォルダ設定';
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clear();

  const rows = [
    ['フォルダ名', '用途', 'フォルダID', 'フォルダURL'],
    [PROJECT_FOLDER_NAME, 'プロジェクト親フォルダ', projectFolder.getId(), projectFolder.getUrl()],
    ['01_投稿待ち', 'あなたが写真を入れる場所', folders['01_投稿待ち'].getId(), folders['01_投稿待ち'].getUrl()],
    ['02_背景透過済み', 'AI背景透過後の画像保存先', folders['02_背景透過済み'].getId(), folders['02_背景透過済み'].getUrl()],
    ['03_生成画像', 'Canvaで生成した投稿画像の保存先', folders['03_生成画像'].getId(), folders['03_生成画像'].getUrl()],
    ['04_承認待ち', '投稿前確認用の素材保管', folders['04_承認待ち'].getId(), folders['04_承認待ち'].getUrl()],
    ['05_投稿済み', '投稿済み素材の保管', folders['05_投稿済み'].getId(), folders['05_投稿済み'].getUrl()],
    ['06_エラー確認', '失敗・要確認データの隔離', folders['06_エラー確認'].getId(), folders['06_エラー確認'].getUrl()],
    ['99_テンプレート', '投稿ルール・プロンプト保管', folders['99_テンプレート'].getId(), folders['99_テンプレート'].getUrl()]
  ];

  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#e8f0fe');
  sheet.autoResizeColumns(1, rows[0].length);
}

function setupPromptSheet_(ss) {
  const sheetName = '投稿ルール';
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clear();

  const rows = [
    ['項目', 'ルール'],
    ['Instagram画像', '1080x1350。スマホで見やすく、文字は少なめ。商品写真を活かす。'],
    ['X画像', '1080x1080。1テーマに絞る。文字はさらに少なめ。'],
    ['Instagram本文', '日本語のみ。CTAあり。500文字以内推奨。ハッシュタグ最大5個。'],
    ['X本文', '短文。自然な文章。Instagram投稿と連動。'],
    ['CTA', 'DM相談・注文・プロフィール確認など、明確な行動導線を入れる。'],
    ['禁止', '過度な誇大表現、未確認価格、商標・ロゴの無断強調、権利上危ない表現。']
  ];

  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#e8f0fe');
  sheet.autoResizeColumns(1, rows[0].length);
}

function createTemplateFiles_(templateFolder) {
  const files = {
    'instagram_image_prompt.md': instagramImagePrompt_(),
    'caption_prompt.md': captionPrompt_(),
    'yoom_flow_spec.md': yoomFlowSpec_(),
    'buffer_posting_spec.md': bufferPostingSpec_()
  };

  Object.entries(files).forEach(([name, content]) => {
    const existing = templateFolder.getFilesByName(name);
    if (!existing.hasNext()) {
      templateFolder.createFile(name, content, MimeType.PLAIN_TEXT);
      Logger.log('[CREATE] テンプレート作成: ' + name);
    } else {
      Logger.log('[SKIP] テンプレート既存: ' + name);
    }
  });
}

function instagramImagePrompt_() { return `# Instagram投稿画像生成プロンプト`; }
function captionPrompt_() { return `# 投稿文生成プロンプト`; }
function yoomFlowSpec_() { return `# Yoomフロー仕様`; }
function bufferPostingSpec_() { return `# Buffer投稿仕様`; }
