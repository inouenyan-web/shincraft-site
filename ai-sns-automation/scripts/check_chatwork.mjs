// Chatwork の「既読ルームのみ」をスキャンし、受注関連＋"途中（未対応・未返信）"の会話を
// 運用ボード.md へタスク化するスクリプト。
//
// 方針（井上さん指示）:
// ・「既読の分だけチェック」: 未読が残っているルームは本文を取得しない＝既読化しない。
//    → 未読ありルームは「未読あり（手動確認）」として件数だけ記録。
// ・「既読分でも会話の文面から途中のものが無いか精査」:
//    既読ルームの直近メッセージを読み、(1)受注キーワード だけでなく、
//    (2)相手の最後の発言が未返信のまま＝こちらの対応待ち（途中）かどうかを判定する。
//    最後の発言が相手で、かつ 質問/依頼/受注 を含む場合は「🔴 未返信（途中・要対応）」として最優先表示。
//
// 必要env: CHATWORK_API_TOKEN（未設定/失敗時は graceful skip。トークンはログに出さない）
// 実行: node scripts/check_chatwork.mjs

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const BOARD_PATH = resolve(REPO_ROOT, "運用ボード.md");

const BASE = "https://api.chatwork.com/v2";
const MAX_ROOMS_SCAN = 40;
const RECENT_SEC = 3 * 24 * 3600; // 直近3日

const START = "<!-- CHATWORK_INBOX:START -->";
const END = "<!-- CHATWORK_INBOX:END -->";

// 受注・取引に関わる語
const ORDER_KEYWORDS = [
  "受注", "注文", "ご注文", "発注", "オーダー", "見積", "お見積", "見積もり",
  "納期", "在庫", "数量", "名入れ", "購入", "注文書", "見積書", "請求",
  "オリジナル", "ロゴ", "刺繍", "プリント", "サンプル", "枚", "個",
];

// 「相手がこちらの対応を待っている＝途中」を示す語（質問・依頼・催促）
const PENDING_HINTS = [
  "？", "?", "ですか", "ますか", "でしょうか", "いかが", "お願い", "おねがい",
  "ください", "頂け", "いただけ", "可能", "いつ", "教えて", "希望", "検討",
  "返事", "返信", "ご連絡", "連絡待", "まだ", "どうなり", "いくら", "料金",
  "価格", "金額", "発送", "いつ頃", "間に合", "至急", "急ぎ",
];

function jstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
}
const oneLine = (s, n = 90) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t || "（本文なし）";
};
const has = (text, arr) => arr.some((k) => String(text || "").includes(k));

async function api(path, token) {
  const res = await fetch(BASE + path, { headers: { "X-ChatWorkToken": token } });
  if (res.status === 204) return [];
  if (!res.ok) throw new Error("status " + res.status + " (" + path + ")");
  return res.json();
}

function buildSection(pending, orders, unreadRooms, scannedRooms) {
  const stamp = jstNow();
  const lines = [START, `### 💬 ${stamp} Chatwork 新着チェック（既読ルーム精査）`, ""];
  lines.push(`既読ルーム ${scannedRooms}件を走査 / 途中・要対応 ${pending.length}件 / 受注関連 ${orders.length}件`);
  lines.push("");

  if (pending.length) {
    lines.push("**🔴 途中・要対応（相手の最後の発言が未返信のまま）:**");
    for (const p of pending.slice(0, 20)) {
      lines.push(`- [ ] [${oneLine(p.room, 24)}] ${p.who}: ${oneLine(p.body)}`);
    }
    if (pending.length > 20) lines.push(`- …ほか ${pending.length - 20}件`);
    lines.push("");
  }

  if (orders.length) {
    lines.push("**🧾 受注関連（会話中に受注の話あり）:**");
    for (const o of orders.slice(0, 20)) {
      lines.push(`- [ ] [${oneLine(o.room, 24)}] ${o.who}: ${oneLine(o.body)}`);
    }
    if (orders.length > 20) lines.push(`- …ほか ${orders.length - 20}件`);
    lines.push("");
  }

  if (!pending.length && !orders.length) {
    lines.push("既読分に途中・受注関連の新着なし。");
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
  const s = board.indexOf(START), e = board.indexOf(END);
  if (s !== -1 && e !== -1 && e > s) return board.slice(0, s) + section + board.slice(e + END.length);
  const marker = "## 🏃 進行中タスク";
  const idx = board.indexOf(marker);
  const block = section + "\n\n";
  return idx >= 0 ? board.slice(0, idx) + block + board.slice(idx) : board + "\n\n" + block;
}

async function main() {
  const token = process.env.CHATWORK_API_TOKEN;
  if (!token) { console.log("⏭️ CHATWORK_API_TOKEN 未設定のためスキップ"); return; }

  // 自分のaccount_id（送信者が自分か相手かの判定に使う）
  let myId = null;
  try { const me = await api("/me", token); myId = me && me.account_id; } catch (_) {}

  let rooms;
  try { rooms = await api("/rooms", token); }
  catch (e) { console.log("⏭️ Chatworkルーム一覧取得に失敗（スキップ）:", e.message); return; }
  if (!Array.isArray(rooms)) { console.log("⏭️ Chatwork応答が想定外（スキップ）"); return; }

  const nowSec = Math.floor(Date.now() / 1000);
  const unreadRooms = rooms.filter((r) => (r.unread_num || 0) > 0);
  const readActive = rooms
    .filter((r) => (r.unread_num || 0) === 0)
    .filter((r) => r.last_update_time && nowSec - r.last_update_time <= RECENT_SEC)
    .slice(0, MAX_ROOMS_SCAN);

  const pending = []; // 途中・要対応（相手の最後の発言が未返信）
  const orders = [];  // 受注関連（途中ではないが受注の話あり）

  for (const room of readActive) {
    try {
      const msgs = await api(`/rooms/${room.room_id}/messages?force=1`, token);
      if (!Array.isArray(msgs) || !msgs.length) continue;
      const recent = msgs.filter((m) => m.send_time && nowSec - m.send_time <= RECENT_SEC);
      if (!recent.length) continue;
      recent.sort((a, b) => a.send_time - b.send_time);
      const last = recent[recent.length - 1];
      const lastFromOther = myId ? (last.account && String(last.account.account_id) !== String(myId)) : true;
      const orderHit = recent.some((m) => has(m.body, ORDER_KEYWORDS));
      const lastPendingHit = has(last.body, PENDING_HINTS) || has(last.body, ORDER_KEYWORDS);

      if (lastFromOther && lastPendingHit) {
        // 相手の最後の発言が未返信＝こちらの対応待ち（途中）
        pending.push({ room: room.name, who: (last.account && last.account.name) || "相手", body: last.body });
      } else if (orderHit) {
        const om = [...recent].reverse().find((m) => has(m.body, ORDER_KEYWORDS)) || last;
        orders.push({ room: room.name, who: (om.account && om.account.name) || "不明", body: om.body });
      }
    } catch (_) { /* 個別ルームの失敗は無視 */ }
  }

  let board;
  try { board = await readFile(BOARD_PATH, "utf8"); }
  catch (e) { console.log("⏭️ 運用ボード.md を読めずスキップ:", e.message); return; }

  const section = buildSection(pending, orders, unreadRooms, readActive.length);
  const updated = applyToBoard(board, section);
  if (updated !== board) await writeFile(BOARD_PATH, updated, "utf8");
  console.log(
    `💬 Chatwork 既読${readActive.length}件を精査（途中・要対応${pending.length}件 / 受注関連${orders.length}件 / 未読ルーム${unreadRooms.length}件）を運用ボードに反映しました。`
  );
}

main().catch((e) => {
  console.log("⏭️ Chatworkチェックで想定外エラー（スキップ）:", e.message);
  process.exit(0);
});
