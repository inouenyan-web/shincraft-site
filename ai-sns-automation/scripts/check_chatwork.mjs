// Chatwork の未読メッセージを取得し、受注関連を運用ボード.md へタスク化するスクリプト。
//
// 必要env: CHATWORK_API_TOKEN
// ・未設定 / API失敗 / 解析失敗 のときは何もせず正常終了（graceful skip）＝ワークフローを落とさない。
// ・読み取りのみ（GET）。トークン値はログに出さない。
//
// 実行: node scripts/check_chatwork.mjs

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const BOARD_PATH = resolve(REPO_ROOT, "運用ボード.md");

const START = "<!-- CHATWORK_INBOX:START -->";
const END = "<!-- CHATWORK_INBOX:END -->";

// 受注・取引に関する語。ヒットしたものを「受注関連の可能性」として強調する。
const ORDER_KEYWORDS = [
  "受注", "注文", "ご注文", "発注", "オーダー", "見積", "お見積", "見積もり",
  "納期", "在庫", "数量", "名入れ", "購入", "注文書", "見積書", "请求", "請求",
];

function jstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}

const oneLine = (s, n = 90) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t || "（本文なし）";
};

async function fetchUnread(token) {
  const res = await fetch("https://api.chatwork.com/v2/my/messages?unread=1", {
    headers: { "X-ChatWorkToken": token },
  });
  if (res.status === 204) return []; // 未読なし
  if (!res.ok) throw new Error("Chatwork API status " + res.status);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

function buildSection(items) {
  const stamp = jstNow();
  const orders = items.filter((m) =>
    ORDER_KEYWORDS.some((k) => String(m.body || "").includes(k))
  );

  const lines = [START, `### 💬 ${stamp} Chatwork 新着チェック（自動）`, ""];
  lines.push(`未読 ${items.length}件 / うち受注関連の可能性 ${orders.length}件`);
  lines.push("");
  if (orders.length) {
    lines.push("**🧾 受注関連の可能性（要対応・チェックでクローズ）:**");
    for (const m of orders.slice(0, 20)) {
      const who = (m.account && m.account.name) || "不明";
      lines.push(`- [ ] ${who}: ${oneLine(m.body)}`);
    }
    if (orders.length > 20) lines.push(`- …ほか ${orders.length - 20}件`);
  } else {
    lines.push("受注関連の新着なし。");
  }
  lines.push(END);
  return lines.join("\n");
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
  const token = process.env.CHATWORK_API_TOKEN;
  if (!token) {
    console.log("⏭️ CHATWORK_API_TOKEN 未設定のためスキップ");
    return;
  }

  let items;
  try {
    items = await fetchUnread(token);
  } catch (e) {
    console.log("⏭️ Chatwork取得に失敗したためスキップ:", e.message);
    return;
  }

  let board;
  try {
    board = await readFile(BOARD_PATH, "utf8");
  } catch (e) {
    console.log("⏭️ 運用ボード.md を読めずスキップ:", e.message);
    return;
  }

  const section = buildSection(items);
  const updated = applyToBoard(board, section);
  if (updated !== board) {
    await writeFile(BOARD_PATH, updated, "utf8");
  }
  const orders = items.filter((m) =>
    ORDER_KEYWORDS.some((k) => String(m.body || "").includes(k))
  ).length;
  console.log(`💬 Chatwork 未読${items.length}件（受注関連の可能性${orders}件）を運用ボードに反映しました。`);
}

main().catch((e) => {
  console.log("⏭️ Chatworkチェックで想定外エラー（スキップ）:", e.message);
  process.exit(0);
});
