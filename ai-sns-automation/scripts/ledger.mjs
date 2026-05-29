// 投稿管理台帳のCLI（確認用）。
// 使い方:
//   node scripts/ledger.mjs list             # 全行をJSONで表示
//   node scripts/ledger.mjs status 承認        # 指定ステータスの行を表示

import { listRows, listRowsByStatus } from "./lib/ledger.mjs";

const [cmd, arg] = process.argv.slice(2);

try {
  if (cmd === "list") {
    console.log(JSON.stringify(await listRows(), null, 2));
  } else if (cmd === "status") {
    if (!arg) throw new Error("ステータス値を指定してください（例: 承認）");
    console.log(JSON.stringify(await listRowsByStatus(arg), null, 2));
  } else {
    console.error("使い方: node scripts/ledger.mjs [list | status <値>]");
    process.exit(1);
  }
} catch (e) {
  console.error("エラー: " + String(e.message || e));
  process.exit(1);
}
