// 背景透過バッチ処理（GitHub Actions / 1時間ごと自動実行用）
// APIキー不要・完全無料。
//
// 動作:
//   1. 台帳から「ステータス=未確認 かつ 背景透過画像URL が空」の行を取得
//   2. 各行の元画像URLからDrive fileIdを抽出
//   3. GAS経由でファイルをbase64ダウンロード
//   4. @imgly/background-removal-node でローカル背景透過
//   5. GAS経由で 02_背景透過済み フォルダへアップロード
//   6. 台帳に「背景透過画像URL」を書き戻す
//
// 使い方:
//   node scripts/batch_bg_remove.mjs [--dry-run]
//
// 必要env: GAS_WEBAPP_URL, GAS_SHARED_TOKEN, DRIVE_NOBG_FOLDER_ID

import { removeBg } from "./bg_remove.mjs";
import { listRows, updateRowByManagementId, callGas } from "./lib/ledger.mjs";
import { requireEnv } from "./lib/env.mjs";

const dryRun = process.argv.includes("--dry-run");

function extractFileId(url) {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  try { return new URL(url).searchParams.get("id"); } catch { return null; }
}

async function downloadBase64(fileId) {
  const res = await callGas({ action: "getFileBase64", fileId });
  return { base64: res.base64, mimeType: res.mimeType };
}

async function uploadToDrive(folderId, fileName, base64) {
  const res = await callGas({ action: "uploadFile", folderId, fileName, base64, mimeType: "image/png" });
  return res.url;
}

async function main() {
  const { DRIVE_NOBG_FOLDER_ID } = requireEnv(["DRIVE_NOBG_FOLDER_ID"]);

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
    const fileId = extractFileId(String(row["元画像URL"]).trim());

    if (!fileId) {
      results.push({ managementId, skipped: "fileId抽出失敗" });
      continue;
    }

    if (dryRun) {
      results.push({ managementId, productName, fileId, dryRun: true });
      continue;
    }

    try {
      console.log(`ダウンロード: ${productName}`);
      const { base64: inputBase64 } = await downloadBase64(fileId);

      console.log(`背景透過: ${productName}`);
      const inputBuffer = Buffer.from(inputBase64, "base64");
      const outputBuffer = await removeBg(inputBuffer);

      console.log(`アップロード: ${productName}`);
      const outputBase64 = outputBuffer.toString("base64");
      const nobgUrl = await uploadToDrive(DRIVE_NOBG_FOLDER_ID, `${productName}_nobg.png`, outputBase64);

      await updateRowByManagementId(managementId, { 背景透過画像URL: nobgUrl });

      console.log(`完了: ${productName} → ${nobgUrl}`);
      results.push({ managementId, productName, nobgUrl });
    } catch (e) {
      console.error(`エラー: ${productName} — ${e.message}`);
      results.push({ managementId, productName, error: String(e.message) });
    }
  }

  console.log(JSON.stringify({
    ok: true,
    processed: results.filter((r) => r.nobgUrl).length,
    skipped: results.filter((r) => r.skipped || r.dryRun).length,
    errors: results.filter((r) => r.error).length,
    results,
  }, null, 2));
}

main().catch((e) => {
  console.error("致命的エラー: " + String(e.message || e));
  process.exit(1);
});
