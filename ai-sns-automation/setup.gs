// ShinCRAFT SNS自動投稿 初期構築スクリプト
// 目的:
// Google Driveの「AI」フォルダ配下に、SNS自動投稿用のフォルダ一式とGoogle Sheets管理台帳を作成します。
// 初回実行時はGoogle Drive / Google Sheetsへのアクセス許可が必要です。

const AI_PARENT_FOLDER_ID = '1Nl5ksVJuwEuDZgyb0jr9V6Os9YLzGBcj';
const PROJECT_FOLDER_NAME = 'ShinCRAFT_SNS自動投稿';
const SPREADSHEET_NAME = 'SNS投稿管理台帳_Shincraft';

const SUB_FOLDERS = [
  '01_投稿待ち',
  '02_画像生成用元写真',
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
  const parent = DriveApp.getFolderById(AI_PARENT_FOLDER_ID);
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

  Logger.log('初期構築が完了しました。');
  Logger.log('親フォルダ: ' + projectFolder.getUrl());
  Logger.log('管理台帳: ' + ss.getUrl());
}

function getOrCreateFolder_(parentFolder, folderName) {
  const existing = parentFolder.getFoldersByName(folderName);
  if (existing.hasNext()) return existing.next();
  return parentFolder.createFolder(folderName);
}

function createOrFindSpreadsheet_(spreadsheetName, targetFolder) {
  const existingFiles = targetFolder.getFilesByName(spreadsheetName);
  while (existingFiles.hasNext()) {
    const file = existingFiles.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
      return SpreadsheetApp.openById(file.getId());
    }
  }

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
    ['01_投稿待ち', 'あなたが写真を入れる場所。Yoomの監視対象', folders['01_投稿待ち'].getId(), folders['01_投稿待ち'].getUrl()],
    ['02_画像生成用元写真', '処理用にコピー保存する場所', folders['02_画像生成用元写真'].getId(), folders['02_画像生成用元写真'].getUrl()],
    ['03_生成画像', 'ChatGPTで生成した投稿画像の保存先', folders['03_生成画像'].getId(), folders['03_生成画像'].getUrl()],
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
    }
  });
}

function instagramImagePrompt_() {
  return `# Instagram投稿画像生成プロンプト\n\nShinCRAFTの商品写真をもとに、Instagramフィード用の投稿画像を作成してください。\n\n## 仕様\n- サイズ: 1080x1350\n- 縦長4:5\n- スマホで読みやすい\n- 商品写真を主役にする\n- 文字は少なめ\n- 余白をしっかり確保\n- 今風でシンプル\n- 高級感よりも、実用性と温かみを優先\n- ロゴやQRコードがある場合は勝手に改変しない\n\n## 入れる要素\n- 短い見出し\n- 商品写真\n- 1行サブコピー\n- 必要なら小さくCTA\n\n## 禁止\n- 文字を詰め込みすぎない\n- 派手すぎる装飾\n- 商品の形を変える\n- ロゴを勝手に作り替える\n`;}

function captionPrompt_() {
  return `# 投稿文生成プロンプト\n\nShinCRAFTのInstagram投稿文とX投稿文を作成してください。\n\n## Instagram\n- 日本語のみ\n- 500文字以内\n- CTAあり\n- ハッシュタグ最大5個\n- 商品の用途・魅力・相談導線を明確にする\n- 営業臭くしすぎない\n\n## X\n- 短く自然に\n- 画像と合わせて伝わる文章\n- 必要ならInstagramへの誘導\n\n## 出力形式\nInstagram本文:\n\nX本文:\n\nハッシュタグ:\n`;}

function yoomFlowSpec_() {
  return `# Yoomフロー仕様\n\n## フロー1: 新規画像受付\nトリガー: Google Drive「01_投稿待ち」に新規画像追加\n処理:\n1. Google Sheets「投稿管理」に新規行追加\n2. ステータスを「未確認」にする\n3. 元画像URLを記録\n4. 画像生成処理へ渡す\n\n## フロー2: 生成結果登録\n処理:\n1. 生成画像URLを記録\n2. Instagram本文・X本文を記録\n3. あなたへ通知\n\n## フロー3: 承認後投稿\nトリガー: ステータスが「承認」\n処理:\n1. Bufferへ投稿予約\n2. 成功時「投稿予約済み」\n3. 失敗時「エラー」\n`;}

function bufferPostingSpec_() {
  return `# Buffer投稿仕様\n\n## Instagram\n- 画像: 生成画像URL\n- 本文: Instagram本文 + ハッシュタグ\n- 投稿予定日: Google Sheetsの投稿予定日\n\n## X\n- 画像: X用画像またはInstagram画像\n- 本文: X本文\n\n## 注意\nBuffer APIに渡す画像URLは、外部からアクセス可能なURLである必要があります。Google Driveの通常共有URLは失敗する可能性があるため、Yoomまたは中継処理側で公開URL化を確認してください。\n`;}
