// Square アイテムの「オンラインで販売」を一括ONにする。
// =====================================================================
// 既定は dry-run（安全側）。実際に書き込むには --apply が必要。
//
// 使い方:
//   node scripts/set_items_online.mjs                 # dry-run（変更対象を表示するだけ）
//   node scripts/set_items_online.mjs --apply         # 実際に更新を適用
//   node scripts/set_items_online.mjs --limit 5 --apply   # 先頭5件だけ適用（検証用）
//
// オプション:
//   --apply                実適用（無いと dry-run）
//   --limit N              先頭N件だけ対象にする（段階適用の検証に）
//   --no-ecom-visible      ecom_visibility=VISIBLE を設定しない
//   --no-available-online  available_online=true を設定しない
//
// 「オンラインで販売」に対応するフィールドは店舗構成により異なるため、既定では
//   ecom_visibility = VISIBLE  （Square Online サイト上で表示・購入可）
//   available_online = true    （レガシーのオンライン販売フラグ）
// の両方を立てる。dry-run で各アイテムの現状値を確認し、必要なら --no-* で絞ること。
//
// 安全性:
//   - read-modify-write：既存の item_data（名称・バリエーション・ロケーション設定など）を
//     保持したままフラグだけ変更するため、他項目を消さない。
//   - object version による楽観ロック。idempotency_key 付きで再送安全。
// =====================================================================

import { listAllItems, batchUpsert } from "./lib/square.mjs";

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const apply = has("--apply");
const setEcom = !has("--no-ecom-visible");
const setAvail = !has("--no-available-online");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

function needsUpdate(item) {
  const d = item.item_data || {};
  if (setEcom && d.ecom_visibility !== "VISIBLE") return true;
  if (setAvail && d.available_online !== true) return true;
  return false;
}

function buildUpdated(item) {
  // 既存 item_data（variations 含む）を保持し、対象フラグだけ変更する
  const d = { ...(item.item_data || {}) };
  if (setEcom) d.ecom_visibility = "VISIBLE";
  if (setAvail) d.available_online = true;
  return {
    id: item.id,
    type: "ITEM",
    version: item.version,
    item_data: d,
    // ロケーション設定は読み取った値をそのまま戻して状態を維持する
    ...(item.present_at_all_locations !== undefined
      ? { present_at_all_locations: item.present_at_all_locations }
      : {}),
    ...(item.present_at_location_ids ? { present_at_location_ids: item.present_at_location_ids } : {}),
    ...(item.absent_at_location_ids ? { absent_at_location_ids: item.absent_at_location_ids } : {}),
  };
}

async function main() {
  if (!setEcom && !setAvail) {
    throw new Error("--no-ecom-visible と --no-available-online を同時指定すると変更項目がありません。");
  }
  const fields = [setEcom && "ecom_visibility=VISIBLE", setAvail && "available_online=true"]
    .filter(Boolean)
    .join(", ");

  console.error(`[1/3] アイテム取得中…（SQUARE_ENV=${process.env.SQUARE_ENV || "prod"}）`);
  let items = await listAllItems();
  console.error(`  取得: ${items.length} 件`);
  if (limit !== Infinity && Number.isFinite(limit)) {
    items = items.slice(0, limit);
    console.error(`  --limit により先頭 ${items.length} 件に絞り込み`);
  }

  const targets = items.filter(needsUpdate);
  console.error(`[2/3] 変更対象: ${targets.length} / ${items.length} 件　設定項目: ${fields}`);
  for (const it of targets.slice(0, 10)) {
    const d = it.item_data || {};
    console.error(
      `   - ${d.name || "(無名)"} [${it.id}] ecom=${d.ecom_visibility ?? "未設定"} online=${d.available_online ?? "未設定"}`
    );
  }
  if (targets.length > 10) console.error(`   …他 ${targets.length - 10} 件`);

  if (!apply) {
    console.error(`\n[dry-run] 適用していません。実行するには --apply を付けてください。`);
    return;
  }
  if (targets.length === 0) {
    console.error(`\n変更対象がないため、適用はスキップしました。`);
    return;
  }

  console.error(`[3/3] バッチ更新を適用中…`);
  const results = await batchUpsert(targets.map(buildUpdated));
  const updated = results.reduce((n, r) => n + (r.objects || []).length, 0);
  console.error(`  更新完了: ${updated} 件`);
}

main().catch((e) => {
  console.error("エラー: " + String(e.message || e));
  if (e.errors) console.error(JSON.stringify(e.errors, null, 2));
  process.exit(1);
});
