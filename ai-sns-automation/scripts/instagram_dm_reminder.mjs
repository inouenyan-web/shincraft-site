// Instagram DM 手動チェックのリマインドを運用ボード.mdへ反映するスクリプト。
//
// 方針（全員会議の結論）:
// ・お客様のDMをAPIで自動取得するには Meta App Review（アドバンスアクセス）が必要で、
//   アプリが開発モードの間はお客様DMがAPIから見えない（0件）。
// ・当面は「Meta Business Suite（公式・無料の受信箱）」をDM対応窓口とし、
//   その「未対応」DMを1日数回チェックする運用にする（審査不要・課金なし・凍結リスクなし）。
// ・本スクリプトは、その手動チェックのリマインドを運用ボードに出すだけ（外部通信なし）。
//
// 実行: node scripts/instagram_dm_reminder.mjs

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const BOARD_PATH = resolve(REPO_ROOT, "運用ボード.md");

const START = "<!-- IG_DM_REMINDER:START -->";
const END = "<!-- IG_DM_REMINDER:END -->";

function jstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
}

function buildSection() {
  const stamp = jstNow();
  return [
    START,
    `### 📨 ${stamp} Instagram DM チェック（Meta Business Suite）`,
    "",
    "InstagramのDMは **Meta Business Suite の受信箱** で確認してください（公式・無料）。",
    "受信箱には「未対応／対応中／完了」タグがあるので、これがそのままタスク管理になります。",
    "",
    "**やること（1日数回・特に朝/昼/夕）:**",
    "- [ ] Meta Business Suite 受信箱を開く → https://business.facebook.com/latest/inbox/",
    "- [ ] フィルタ「未対応」を確認し、受注・問い合わせに返信（返信したら「完了」に）",
    "- [ ] 受注が固まりそうな会話は、確定情報を Gmail/Chatwork など管理チャネルへ寄せる",
    "",
    "※お客様DMの自動タスク化は Meta App Review 承認後に有効化予定（コードは実装済み）。",
    "それまではこの手動チェックで取りこぼしを防ぎます。",
    END,
  ].join("\n");
}

function applyToBoard(board, section) {
  const s = board.indexOf(START);
  const e = board.indexOf(END);
  if (s !== -1 && e !== -1 && e > s) {
    return board.slice(0, s) + section + board.slice(e + END.length);
  }
  const marker = "## 🏃 進行中タスク";
  const idx = board.indexOf(marker);
  const block = section + "\n\n";
  return idx >= 0 ? board.slice(0, idx) + block + board.slice(idx) : board + "\n\n" + block;
}

async function main() {
  let board;
  try {
    board = await readFile(BOARD_PATH, "utf8");
  } catch (e) {
    console.log("⏭️ 運用ボード.md を読めずスキップ:", e.message);
    return;
  }
  const updated = applyToBoard(board, buildSection());
  if (updated !== board) await writeFile(BOARD_PATH, updated, "utf8");
  console.log("📨 Instagram DM の手動チェック（Meta Business Suite）リマインドを運用ボードに反映しました。");
}

main().catch((e) => {
  console.log("⏭️ IG DMリマインドで想定外エラー（スキップ）:", e.message);
  process.exit(0);
});
