// 指定フォルダ内の画像を一括で背景透過するスクリプト。
// ダウンロード・アップロードは GAS Web App 経由でサーバー側処理（トークン上限の影響なし）。
// 背景透過は @imgly/background-removal-node でローカル実行。
//
// 使い方:
//   node scripts/process_photoroom.mjs [--dry-run]
//
// 必要env: GAS_WEBAPP_URL, GAS_SHARED_TOKEN
// 前提: GAS側に listFolder / getFileBase64 / uploadFile アクションが必要（apps-script/Code.gs）

import { removeBackground } from "@imgly/background-removal-node";
import { callGas } from "./lib/ledger.mjs";

const SRC_FOLDER_ID = "1vpJbqdCtwvvNIPDO09BAiml7_Q_4qs6c"; // ShinCRAFT_photoroom
const DEST_FOLDER_ID = "1kOBaGvnlmONg1t0eNFyIsdUZ4oeZPXOm"; // 02_背景透過済み
const dryRun = process.argv.includes("--dry-run");

async function removeBg(inputBuffer, mimeType) {
  const blob = new Blob([inputBuffer], { type: mimeType || "image/jpeg" });
  const result = await removeBackground(blob);
  const arrayBuffer = await result.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  const list = await callGas({ action: "listFolder", folderId: SRC_FOLDER_ID });
  const files = (list.files || []).filter((f) => String(f.mimeType || "").startsWith("image/"));

  if (files.length === 0) {
    console.log(JSON.stringify({ ok: true, processed: 0, message: "画像なし" }));
    return;
  }
  console.log(`処理対象: ${files.length}件`);

  const results = [];
  for (const f of files) {
    if (dryRun) {
      console.log(`[dry-run] ${f.name}`);
      results.push({ name: f.name, id: f.id, dryRun: true });
      continue;
    }
    try {
      const dl = await callGas({ action: "getFileBase64", fileId: f.id });
      const inputBuffer = Buffer.from(dl.base64, "base64");
      const outputBuffer = await removeBg(inputBuffer, dl.mimeType || f.mimeType);
      const outName = f.name.replace(/(\.[^.]+)?$/, "_nobg.png");
      const up = await callGas({
        action: "uploadFile",
        folderId: DEST_FOLDER_ID,
        fileName: outName,
        base64: outputBuffer.toString("base64"),
        mimeType: "image/png",
      });
      console.log(`完了: ${f.name} → ${up.url}`);
      results.push({ name: f.name, url: up.url });
    } catch (e) {
      console.error(`エラー: ${f.name} — ${e.message}`);
      results.push({ name: f.name, error: String(e.message) });
    }
  }
  console.log(JSON.stringify({
    ok: true,
    processed: results.filter((r) => r.url).length,
    errors: results.filter((r) => r.error).length,
    results,
  }, null, 2));
}

main().catch((e) => {
  console.error("致命的エラー: " + String(e.message || e));
  process.exit(1);
});
