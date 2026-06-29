// Instagram DM（受信箱）を取得し、受注関連＋"途中（未返信・要対応）"の会話を
// 運用ボード.md へタスク化するスクリプト。
//
// 方式: Instagram API with Instagram Business Login（graph.instagram.com）
// 必要env: IG_DM_TOKEN（長期アクセストークン / scope: instagram_business_basic, instagram_business_manage_messages）
// ・未設定/認証失敗/API失敗 のときは graceful skip（ワークフローを落とさない）。トークンはログに出さない。
//
// 精査方針（井上さん指示）:
// ・受注キーワードだけでなく、会話の文面から「途中（こちらの対応待ち）」のものを拾う。
//   各会話の最後のメッセージが相手から（＝未返信）で、質問/依頼/受注を含む場合は
//   「🔴 途中・要対応」として最優先で表示する。
//
// 実行: node scripts/check_instagram_dm.mjs

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const BOARD_PATH = resolve(REPO_ROOT, "運用ボード.md");

const GRAPH = "https://graph.instagram.com";
const START = "<!-- IG_DM_INBOX:START -->";
const END = "<!-- IG_DM_INBOX:END -->";

const ORDER_KEYWORDS = [
  "受注", "注文", "ご注文", "発注", "オーダー", "見積", "お見積", "見積もり",
  "納期", "在庫", "数量", "名入れ", "購入", "注文書", "見積書", "請求",
  "オリジナル", "ロゴ", "刺繍", "プリント", "枚", "個", "サンプル",
  "order", "invoice", "quote",
];

// 相手がこちらの対応を待っている＝途中 を示す語
const PENDING_HINTS = [
  "？", "?", "ですか", "ますか", "でしょうか", "いかが", "お願い", "おねがい",
  "ください", "頂け", "いただけ", "可能", "いつ", "教えて", "希望", "検討",
  "返事", "返信", "連絡", "まだ", "いくら", "料金", "価格", "金額", "発送",
  "いつ頃", "間に合", "至急", "急ぎ", "どう",
];

const MAX_CONVERSATIONS = 25;
const RECENT_MS = 3 * 24 * 3600 * 1000;

function jstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
}
const oneLine = (s, n = 90) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t || "（本文なし）";
};
const has = (text, arr) => arr.some((k) => String(text || "").includes(k));

async function gget(path, token) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${GRAPH}${path}${sep}access_token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    let detail = "";
    try { const j = await res.json(); detail = (j.error && (j.error.message || j.error.type)) || ""; } catch (_) {}
    throw new Error(`status ${res.status}${detail ? " " + detail : ""} (${path})`);
  }
  return res.json();
}

function buildSection(pending, orders, convScanned, note) {
  const stamp = jstNow();
  const lines = [START, `### 📩 ${stamp} Instagram DM 新着チェック（会話精査）`, ""];
  if (note) lines.push(note, "");
  lines.push(`会話 ${convScanned}件を走査 / 途中・要対応 ${pending.length}件 / 受注関連 ${orders.length}件`);
  lines.push("");
  if (pending.length) {
    lines.push("**🔴 途中・要対応（相手の最後のDMが未返信のまま）:**");
    for (const p of pending.slice(0, 20)) lines.push(`- [ ] [DM] ${oneLine(p.who, 24)}: ${oneLine(p.body)}`);
    if (pending.length > 20) lines.push(`- …ほか ${pending.length - 20}件`);
    lines.push("");
  }
  if (orders.length) {
    lines.push("**🧾 受注関連（会話中に受注の話あり）:**");
    for (const o of orders.slice(0, 20)) lines.push(`- [ ] [DM] ${oneLine(o.who, 24)}: ${oneLine(o.body)}`);
    if (orders.length > 20) lines.push(`- …ほか ${orders.length - 20}件`);
    lines.push("");
  }
  if (!pending.length && !orders.length && !note) lines.push("受注関連・途中の新着DMなし。");
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

async function fetchAnalysis(token) {
  const me = await gget("/me?fields=user_id,username", token); // 認証チェック兼ねる
  const conv = await gget(
    `/me/conversations?platform=instagram&fields=id,updated_time&limit=${MAX_CONVERSATIONS}`,
    token
  );
  const conversations = (conv && conv.data) || [];
  const now = Date.now();
  const pending = [];
  const orders = [];

  for (const c of conversations) {
    try {
      const msgs = await gget(`/${c.id}?fields=messages.limit(20){id,created_time,from,message}`, token);
      let list = (msgs.messages && msgs.messages.data) || [];
      // created_time 昇順に並べ替え（古→新）
      list = list
        .map((m) => ({ ...m, _t: m.created_time ? Date.parse(m.created_time) : now }))
        .filter((m) => now - m._t <= RECENT_MS)
        .sort((a, b) => a._t - b._t);
      if (!list.length) continue;
      const last = list[list.length - 1];
      const lastFromOther = !(last.from && me.user_id && String(last.from.id) === String(me.user_id));
      const orderHit = list.some((m) => has(m.message, ORDER_KEYWORDS));
      const lastPendingHit = has(last.message, PENDING_HINTS) || has(last.message, ORDER_KEYWORDS);
      const whoOf = (m) => (m.from && (m.from.username || m.from.id)) || "相手";

      if (lastFromOther && lastPendingHit) {
        pending.push({ who: whoOf(last), body: last.message });
      } else if (orderHit) {
        const om = [...list].reverse().find((m) => has(m.message, ORDER_KEYWORDS)) || last;
        orders.push({ who: whoOf(om), body: om.message });
      }
    } catch (_) { /* 個別会話の失敗は無視 */ }
  }
  return { pending, orders, scanned: conversations.length };
}

async function main() {
  const token = process.env.IG_DM_TOKEN;
  if (!token) {
    console.log("⏭️ IG_DM_TOKEN 未設定のためスキップ（DM自動化はトークン登録後に自動有効化）");
    return;
  }

  let result;
  try {
    result = await fetchAnalysis(token);
  } catch (e) {
    const note = `⚠️ DM取得に失敗（${e.message}）。トークン失効/権限の可能性 → 再ログインで長期トークンを再発行してください。`;
    console.log("⏭️ Instagram DM:", note);
    try {
      const board = await readFile(BOARD_PATH, "utf8");
      const updated = applyToBoard(board, buildSection([], [], 0, note));
      if (updated !== board) await writeFile(BOARD_PATH, updated, "utf8");
    } catch (_) {}
    return;
  }

  let board;
  try { board = await readFile(BOARD_PATH, "utf8"); }
  catch (e) { console.log("⏭️ 運用ボード.md を読めずスキップ:", e.message); return; }

  const section = buildSection(result.pending, result.orders, result.scanned, null);
  const updated = applyToBoard(board, section);
  if (updated !== board) await writeFile(BOARD_PATH, updated, "utf8");
  console.log(
    `📩 Instagram DM 会話${result.scanned}件を精査（途中・要対応${result.pending.length}件 / 受注関連${result.orders.length}件）を運用ボードに反映しました。`
  );
}

main().catch((e) => {
  console.log("⏭️ Instagram DMチェックで想定外エラー（スキップ）:", e.message);
  process.exit(0);
});
