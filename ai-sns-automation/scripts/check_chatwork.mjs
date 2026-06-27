// Chatwork の「既読ルームのみ」をスキャンして受注関連を運用ボード.md へタスク化するスクリプト。
//
// 方針（井上さん指示「既読の分だけチェック」）:
// ・未読が残っているルームは本文を取得しない＝既読化しない（未読バッジを動かさない）。
//   → 未読ありルームは「未読あり（手動確認）」として件数だけ記録。
// ・未読0（＝すでに全部既読）のルームだけ本文を取得し、直近2日のメッセージから受注関連を抽出。
//   既読ルームのみ読むので、Chatworkの未読状態は変化しない。
//
// 必要env: CHATWORK_API_TOKEN
// ・未設定 / API失敗 のときは graceful skip（ワークフローを落とさない）。トークン値はログに出さない。
//
// 実行: node scripts/check_chatwork.mjs

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const BOARD_PATH = resolve(REPO_ROOT, "運用ボード.md");

const BASE = "https://api.chatwork.com/v2";
const MAX_ROOMS_SCAN = 40; // 本文スキャンする既読ルームの上限
const RECENT_SEC = 2 * 24 * 3600; // 直近2日のメッセージのみ対象

const START = "<!-- CHATWORK_INBOX:START -->";
const END = "<!-- CHATWORK_INBOX:END -->";

const ORDER_KEYWORDS = [
  "受注", "注文", "ご注文", "発注", "オーダー", "見積", "お見積", "見積もり",
  "納期", "在庫", "数量", "名入れ", "購入", "注文書", "見積書", "請求",
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

async function api(path, token) {
  const res = await fetch(BASE + path, { headers: { "X-ChatWorkToken": token } });
  if (res.status === 204) return []; // No Content
  if (!res.ok) throw new Error("status " + res.status + " (" + path + ")");
  return res.json();
}

function buildSection(orders, unreadRooms, scannedRooms) {
  const stamp = jstNow();
  const lines = [START, `### 💬 ${stamp} Chatwork 新着チェック（既読ルームのみ自動）`, ""];
  lines.push(`既読ルーム ${scannedRooms}件を走査 / 受注関連の可能性 ${orders.length}件`);
  lines.push("");

  if (orders.length) {
    lines.push("**🧾 受注関連の可能性（既読分・チェックでクローズ）:**");
    for (const o of orders.slice(0, 20)) {
      lines.push(`- [ ] [${oneLine(o.room, 24)}] ${o.who}: ${oneLine(o.body)}`);
    }
    if (orders.length > 20) lines.push(`- …ほか ${orders.length - 20}件`);
    lines.push("");
  } else {
    lines.push("既読分に受注関連の新着なし。");
    lines.push("");
  }

  if (unreadRooms.length) {
    lines.push("**📨 未読あり（消費しないので手動で確認してください）:**");
    for (const r of unreadRooms.slice(0, 20)) {
      lines.push(`- ${oneLine(r.name, 30)}：未読 ${r.unread_num}件`);
    }
    if (unreadRooms.length > 20) lines.push(`- …ほか ${unreadRooms.length - 20}ルーム`);
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

  let rooms;
  try {
    rooms = await api("/rooms", token);
  } catch (e) {
    console.log("⏭️ Chatworkルーム一覧取得に失敗（スキップ）:", e.message);
    return;
  }
  if (!Array.isArray(rooms)) {
    console.log("⏭️ Chatwork応答が想定外（スキップ）");
    return;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const unreadRooms = rooms.filter((r) => (r.unread_num || 0) > 0);
  // 既読(未読0) かつ 直近に更新のあったルームだけ本文スキャン対象にする
  const readActive = rooms
    .filter((r) => (r.unread_num || 0) === 0)
    .filter((r) => r.last_update_time && nowSec - r.last_update_time <= RECENT_SEC)
    .slice(0, MAX_ROOMS_SCAN);

  const orders = [];
  for (const room of readActive) {
    try {
      // 既読ルームのみ。force=1 で最新100件を取得（既読位置は既に最新のため未読は発生しない）。
      const msgs = await api(`/rooms/${room.room_id}/messages?force=1`, token);
      for (const m of msgs) {
        if (!m.send_time || nowSec - m.send_time > RECENT_SEC) continue;
        if (ORDER_KEYWORDS.some((k) => String(m.body || "").includes(k))) {
          orders.push({
            room: room.name,
            who: (m.account && m.account.name) || "不明",
            body: m.body,
          });
        }
      }
    } catch (_) {
      /* 個別ルームの失敗は無視して続行 */
    }
  }

  let board;
  try {
    board = await readFile(BOARD_PATH, "utf8");
  } catch (e) {
    console.log("⏭️ 運用ボード.md を読めずスキップ:", e.message);
    return;
  }

  const section = buildSection(orders, unreadRooms, readActive.length);
  const updated = applyToBoard(board, section);
  if (updated !== board) {
    await writeFile(BOARD_PATH, updated, "utf8");
  }
  console.log(
    `💬 Chatwork 既読ルーム${readActive.length}件を走査（受注関連の可能性${orders.length}件 / 未読ありルーム${unreadRooms.length}件）を運用ボードに反映しました。`
  );
}

main().catch((e) => {
  console.log("⏭️ Chatworkチェックで想定外エラー（スキップ）:", e.message);
  process.exit(0);
});
