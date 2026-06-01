// PhotoRoom 背景透過バッチ処理（GitHub Actions / 定期実行用）
//
// 動作:
//   1. 台帳から「ステータス=未確認 かつ 背景透過画像URL が空」の行を取得
//   2. 各行の元画像URLからDrive fileIdを抽出
//   3. GAS経由でファイルをbase64ダウンロード
//   4. PhotoRoom APIで背景透過
//   5. GAS経由で 02_背景透過済み フォルダへアップロード
//   6. 台帳に「背景透過画像URL」を書き戻す
//
// 使い方:
//   node scripts/batch_photoroom.mjs [--dry-run]
//
// 必要env:
//   GAS_WEBAPP_URL, GAS_SHARED_TOKEN, PHOTOROOM_API_KEY, DRIVE_NOBG_FOLDER_ID

import { removeBackground } from "./photoroom.mjs";
import { listRows, updateRowByManagementId } from "./lib/ledger.mjs";
import { requireEnv, optionalEnv } from "./lib/env.mjs";
import { callGas } from "./lib/ledger.mjs";

const dryRun = process.argv.includes("--dry-run");

/** Google Drive の共有URLから fileId を抽出 */
function extractFileId(url) {
  if (!url) return null;
  // https://drive.google.com/file/d/{fileId}/view
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  // https://drive.google.com/open?id={fileId}
  try {
    return new URL(url).searchParams.get("id");
  } catch {
    return null;
  }
}

/** GAS経由でファイルをbase64ダウンロード */
async function downloadFileBase64(fileId) {
  const res = await callGas({ action: "getFileBase64", fileId });
  return { base64: res.base64, mimeType: res.mimeType };
}

/** GAS経由でファイルをDriveフォルダへアップロード */
async function uploadFileToDrive(folderId, fileName, base64) {
  const res = await callGas({
    action: "uploadFile",
    folderId,
    fileName,
    base64,
    mimeType: "image/png",
  });
  return res.url;
}

async function main() {
  const { DRIVE_NOBG_FOLDER_ID } = requireEnv(["DRIVE_NOBG_FOLDER_ID"]);

  // 台帳から処理対象行を取得
  const rows = await listRows();
  const targets = rows.filter(
    (r) =>
      String(r["ステータス"] || "").trim() === "未確認" &&
      String(r["元画像URL"] || "").trim() !== "" &&
      String(r["背景透過画像URL"] || "").trim() === ""
  );

  if (targets.length === 0) {
    console.log(JSON.stringify({ ok: true, processed: 0, message: "処理対象なし" }));
    return;
  }

  console.log(`処理対象: ${targets.length}件`);

  const results = [];

  for (const row of targets) {
    const managementId = row["管理ID"];
    const productName = row["商品名"] || managementId;
    const driveUrl = String(row["元画像URL"]).trim();
    const fileId = extractFileId(driveUrl);

    if (!fileId) {
      console.warn(`fileId抽出失敗: ${productName} (URL: ${driveUrl})`);
      results.push({ managementId, skipped: "fileId抽出失敗" });
      continue;
    }

    if (dryRun) {
      results.push({ managementId, productName, fileId, dryRun: true });
      continue;
    }

    try {
      // ダウンロード
      console.log(`ダウンロード中: ${productName}`);
      const { base64: inputBase64, mimeType } = await downloadFileBase64(fileId);

      // 背景透過
      console.log(`背景透過中: ${productName}`);
      const ext = mimeType?.includes("png") ? "png" : "jpg";
      const inputBuffer = Buffer.from(inputBase64, "base64");
      const outputBuffer = await removeBackground(inputBuffer, `${productName}.${ext}`);

      // アップロード
      console.log(`アップロード中: ${productName}`);
      const outputBase64 = outputBuffer.toString("base64");
      const nobgFileName = `${productName}_nobg.png`;
      const nobgUrl = await uploadFileToDrive(DRIVE_NOBG_FOLDER_ID, nobgFileName, outputBase64);

      // 台帳更新
      await updateRowByManagementId(managementId, { 背景透過画像URL: nobgUrl });

      console.log(`完了: ${productName} → ${nobgUrl}`);
      results.push({ managementId, productName, nobgUrl });
    } catch (e) {
      console.error(`エラー: ${productName} — ${e.message}`);
      results.push({ managementId, productName, error: String(e.message) });
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        processed: results.filter((r) => r.nobgUrl).length,
        skipped: results.filter((r) => r.skipped || r.dryRun).length,
        errors: results.filter((r) => r.error).length,
        results,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error("致命的エラー: " + String(e.message || e));
  process.exit(1);
});
