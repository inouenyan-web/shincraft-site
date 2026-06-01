// ShinCRAFT — Google Drive × PhotoRoom 背景透過 自動化
// =====================================================================
// 役割:
//   Google Drive の「photoroom」フォルダに画像を置くと、PhotoRoom API で
//   背景を自動透過し、透過済みPNGを出力フォルダへ保存する。
//   タイムトリガー（既定5分間隔）で動くため、スマホから画像を入れるだけで
//   あとは Google のサーバー上で自動的に処理される（PCやClaude Code不要）。
//
// 処理の流れ:
//   入力(photoroom) に未処理の画像
//        │  タイムトリガー（5分毎）
//        ▼
//   PhotoRoom /v1/segment で背景透過
//        ├─ 成功 → 出力(_透過済み) に <名前>_透過.png を保存し、元画像を _処理済み へ退避
//        └─ 失敗 → 元画像を _エラー へ退避（ログに理由）
//
// セキュリティ:
//   - PhotoRoom APIキーは「スクリプトプロパティ」に保存する（コードに直書きしない）。
//     プロジェクトの設定 > スクリプトプロパティ に PHOTOROOM_API_KEY を登録。
//   - 入力フォルダIDも同様にスクリプトプロパティ PHOTOROOM_FOLDER_ID で渡す。
//
// 初回セットアップ（詳細は ../PHOTOROOM_SETUP.md）:
//   1. このコードを Apps Script プロジェクトに貼り付け。
//   2. スクリプトプロパティに PHOTOROOM_API_KEY と PHOTOROOM_FOLDER_ID を登録。
//   3. 関数 setupPhotoRoomTrigger を一度実行（初回は権限を許可）。
//      → 5分毎の自動処理が開始される。
//   ※ 手動で1回だけ試すなら runPhotoRoomOnce を実行。
// =====================================================================

// --- スクリプトプロパティのキー名 ---
const PR_PROP_API_KEY = 'PHOTOROOM_API_KEY';      // 必須: PhotoRoom APIキー
const PR_PROP_FOLDER_ID = 'PHOTOROOM_FOLDER_ID';  // 必須: 入力(photoroom)フォルダID
const PR_PROP_SIZE = 'PHOTOROOM_SIZE';            // 任意: 出力解像度 full/hd/medium/preview (既定 full)
const PR_PROP_BG_COLOR = 'PHOTOROOM_BG_COLOR';    // 任意: 指定すると透過ではなく単色背景に（例 FFFFFF）

// --- サブフォルダ名（入力フォルダ直下に自動生成） ---
const PR_OUT_FOLDER = '_透過済み';   // 透過済みPNGの保存先
const PR_DONE_FOLDER = '_処理済み';  // 処理成功した元画像の退避先
const PR_ERR_FOLDER = '_エラー';     // 失敗した元画像の退避先

const PR_SEGMENT_URL = 'https://sdk.photoroom.com/v1/segment';
const PR_TRIGGER_HANDLER = 'photoroomScan';   // トリガーが呼ぶ関数名
const PR_TRIGGER_MINUTES = 5;                 // トリガー間隔（分）

// --- 対象とする画像MIMEタイプ ---
const PR_IMAGE_MIME = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif',
];

// =====================================================================
// セットアップ / トリガー管理
// =====================================================================

/** 5分毎の自動処理トリガーを作成する（既存の同名トリガーは作り直す）。 */
function setupPhotoRoomTrigger() {
  assertConfigured_();
  removePhotoRoomTriggers();
  ScriptApp.newTrigger(PR_TRIGGER_HANDLER)
    .timeBased()
    .everyMinutes(PR_TRIGGER_MINUTES)
    .create();
  Logger.log('[OK] %s分毎の自動透過トリガーを作成しました。', PR_TRIGGER_MINUTES);
}

/** このスクリプトのトリガーを全て削除する。 */
function removePhotoRoomTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === PR_TRIGGER_HANDLER) {
      ScriptApp.deleteTrigger(t);
    }
  });
}

/** 手動で1回だけスキャン・処理する（動作確認用）。 */
function runPhotoRoomOnce() {
  const result = photoroomScan();
  Logger.log('[RESULT] %s', JSON.stringify(result));
  return result;
}

// =====================================================================
// メイン処理（トリガーが呼ぶ）
// =====================================================================

/**
 * 入力フォルダの未処理画像を走査し、PhotoRoomで透過して保存する。
 * 多重起動を避けるためLockを取得（取れなければ今回はスキップ）。
 */
function photoroomScan() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    Logger.log('[SKIP] 別の処理が実行中のためスキップしました。');
    return { ok: true, skipped: true };
  }
  try {
    assertConfigured_();
    const props = PropertiesService.getScriptProperties();
    const apiKey = props.getProperty(PR_PROP_API_KEY);
    const inputFolder = DriveApp.getFolderById(props.getProperty(PR_PROP_FOLDER_ID));

    const outFolder = getOrCreateChildFolder_(inputFolder, PR_OUT_FOLDER);
    const doneFolder = getOrCreateChildFolder_(inputFolder, PR_DONE_FOLDER);
    const errFolder = getOrCreateChildFolder_(inputFolder, PR_ERR_FOLDER);

    let processed = 0, failed = 0, skipped = 0;
    const files = inputFolder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (!isProcessableImage_(file)) { skipped++; continue; }
      try {
        const outName = buildOutputName_(file.getName());
        if (outFolder.getFilesByName(outName).hasNext()) {
          // 既に同名の出力がある場合は二重処理を避け、元画像だけ退避
          file.moveTo(doneFolder);
          skipped++;
          continue;
        }
        const cutout = removeBackground_(file, apiKey);
        cutout.setName(outName);
        outFolder.createFile(cutout);
        file.moveTo(doneFolder);
        processed++;
        Logger.log('[DONE] %s → %s/%s', file.getName(), PR_OUT_FOLDER, outName);
      } catch (err) {
        failed++;
        Logger.log('[FAIL] %s: %s', file.getName(), err && err.message ? err.message : err);
        try { file.moveTo(errFolder); } catch (_) {}
      }
    }

    const result = { ok: true, processed: processed, failed: failed, skipped: skipped };
    if (processed || failed) Logger.log('[SUMMARY] %s', JSON.stringify(result));
    return result;
  } finally {
    lock.releaseLock();
  }
}

// =====================================================================
// PhotoRoom 呼び出し
// =====================================================================

/**
 * 1枚の画像の背景を PhotoRoom で透過し、PNG Blobを返す。
 * @param {File} file Drive上の画像ファイル
 * @param {string} apiKey PhotoRoom APIキー
 * @return {Blob} 透過済みPNG（bg_color指定時は単色背景）
 */
function removeBackground_(file, apiKey) {
  const props = PropertiesService.getScriptProperties();
  const payload = {
    image_file: file.getBlob(),
    format: 'png',
    size: props.getProperty(PR_PROP_SIZE) || 'full',
  };
  const bg = props.getProperty(PR_PROP_BG_COLOR);
  if (bg) payload.bg_color = bg; // 指定があれば透過の代わりに単色背景にする

  const res = UrlFetchApp.fetch(PR_SEGMENT_URL, {
    method: 'post',
    headers: { 'x-api-key': apiKey },
    payload: payload, // Blobを含むためApps Scriptがmultipart/form-dataで送信
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  if (code !== 200) {
    throw new Error('PhotoRoom APIエラー HTTP ' + code + ': ' + res.getContentText().slice(0, 300));
  }
  return res.getBlob().setContentType('image/png');
}

// =====================================================================
// ユーティリティ
// =====================================================================

/** 必須スクリプトプロパティが揃っているか確認する。 */
function assertConfigured_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(PR_PROP_API_KEY)) {
    throw new Error('スクリプトプロパティ ' + PR_PROP_API_KEY + ' が未設定です。');
  }
  if (!props.getProperty(PR_PROP_FOLDER_ID)) {
    throw new Error('スクリプトプロパティ ' + PR_PROP_FOLDER_ID + ' が未設定です。');
  }
}

/** ファイルが処理対象の画像か判定する。 */
function isProcessableImage_(file) {
  const mime = String(file.getMimeType() || '').toLowerCase();
  return PR_IMAGE_MIME.indexOf(mime) >= 0;
}

/** 入力名 "abc.jpg" → "abc_透過.png" のように出力名を作る。 */
function buildOutputName_(name) {
  const base = name.replace(/\.[^.]+$/, '');
  return base + '_透過.png';
}

/** 親フォルダ直下の同名フォルダを取得（無ければ作成）。 */
function getOrCreateChildFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}
