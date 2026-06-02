// Chrome版Claude → Claude Code 橋渡しポーリングスクリプト。
// スプシの「連携ブリッジ」シートを GAS API 経由で読み、未処理の行を拾って表示する。
// Chrome for Chrome 拡張機能が claude.ai の回答をこのシートへ転記する想定。
//
// 流れ:
//   claude.ai(Chrome版)が作業 → Chrome拡張がシートへ1行追記 → このスクリプトが検知
//
// 使い方:
//   node scripts/sync_bridge.mjs            # 未処理行を一覧表示
//   node scripts/sync_bridge.mjs --mark <id> # 指定idを処理済みにする
//   /loop 30s node scripts/sync_bridge.mjs   # 定期ポーリング（Claude Code側）
//
// 必要env: GAS_WEBAPP_URL, GAS_SHARED_TOKEN
// 前提: スプシに「連携ブリッジ」シート（列: id / timestamp / type / payload / status）が存在すること

import { callGas } from "./lib/ledger.mjs";

const BRIDGE_SHEET = "連携ブリッジ";
const markIndex = process.argv.indexOf("--mark");
const markId = markIndex >= 0 ? process.argv[markIndex + 1] : null;

async function listBridgeRows() {
  const json = await callGas({ action: "list", sheet: BRIDGE_SHEET });
  return json.rows || [];
}

async function markProcessed(id) {
  await callGas({
    action: "update",
    sheet: BRIDGE_SHEET,
    keyColumn: "id",
    keyValue: id,
    updates: { status: "処理済み" },
  });
  console.log(`処理済みに更新: id=${id}`);
}

async function main() {
  if (markId) {
    await markProcessed(markId);
    return;
  }

  const rows = await listBridgeRows();
  const pending = rows.filter((r) => {
    const s = String(r["status"] || "").trim();
    return s === "" || s === "未処理";
  });

  if (pending.length === 0) {
    console.log(JSON.stringify({ ok: true, pending: 0, message: "新着なし" }));
    return;
  }

  console.log(`新着 ${pending.length}件:`);
  for (const r of pending) {
    console.log(`\n--- id=${r["id"]} (${r["timestamp"]}) ---`);
    console.log(`  type: ${r["type"]}`);
    console.log(`  payload: ${r["payload"]}`);
  }
  console.log(`\n処理後は: node scripts/sync_bridge.mjs --mark <id>`);
}

main().catch((e) => {
  console.error("致命的エラー: " + String(e.message || e));
  process.exit(1);
});
