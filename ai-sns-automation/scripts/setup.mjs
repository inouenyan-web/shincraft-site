// 初回セットアップスクリプト。
// GAS経由でSheetsの「背景透過画像URL」列を自動追加する。
//
// 使い方:
//   node scripts/setup.mjs
//
// 必要env: GAS_WEBAPP_URL, GAS_SHARED_TOKEN

import { callGas } from "./lib/ledger.mjs";

async function main() {
  console.log("セットアップを開始します...");

  const result = await callGas({ action: "setupSheet" });
  console.log("Sheets列チェック:", result.message);

  console.log("\n✅ セットアップ完了");
  console.log("次のステップ: GitHub Secrets に以下を登録してください");
  console.log("  GAS_WEBAPP_URL      : 既存の値");
  console.log("  GAS_SHARED_TOKEN    : 既存の値");
  console.log("  DRIVE_NOBG_FOLDER_ID: 1kOBaGvnlmONg1t0eNFyIsdUZ4oeZPXOm");
}

main().catch((e) => {
  console.error("エラー: " + String(e.message || e));
  process.exit(1);
});
