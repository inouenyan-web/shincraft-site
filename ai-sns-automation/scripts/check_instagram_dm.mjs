// Instagram DM（受信箱）を取得し、受注関連を運用ボード.md へタスク化するスクリプト。
//
// 方式: Instagram API with Instagram Business Login（graph.instagram.com）
// 必要env: IG_DM_TOKEN（長期アクセストークン / scope: instagram_business_basic, instagram_business_manage_messages）
// ・未設定 / 認証失敗 / API失敗 のときは graceful skip（ワークフローを落とさない）。
//   → トークンが GitHub Secret に入った瞬間に、コード変更なしで自動的にDM取得が有効化される。
// ・トークン値はログに出さない。
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

// DMは仕様上、直近メッセージしか取れないため毎回ポーリング前提。
const MAX_CONVERSATIONS = 25;
const RECENT_MS = 3 * 24 * 3600 * 1000; // 直近3日のメッセージを対象

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

async function gget(path, token) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${GRAPH}${path}${sep}access_token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = (j.error && (j.error.message || j.error.type)) || "";
    } catch (_) {}
    throw new Error(`status ${res.status}${detail ? " " + detail : ""} (${path})`);
  }
  return res.json();
}

function buildSection(orders, convScanned, note) {
  const stamp = jstNow();
  const lines = [START, `### 📩 ${stamp} Instagram DM 新着チェック（自動）`, ""];
  if (note) {
    lines.push(note, "");
  }
  lines.push(`会話 ${convScanned}件を走査 / 受注関連の可能性 ${orders.length}件`);
  lines.push("");
  if (orders.length) {
    lines.push("**🧾 受注関連の可能性（要対応・チェックでクローズ）:**");
    for (const o of orders.slice(0, 20)) {
      lines.push(`- [ ] [DM] ${oneLine(o.who, 24)}: ${oneLine(o.body)}`);
    }
    if (orders.length > 20) lines.push(`- …ほか ${orders.length - 20}件`);
  } else if (!note) {
    lines.push("受注関連の新着DMなし。");
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

async function fetchOrders(token) {
  // 自分(=me)の会話一覧 → 各会話の直近メッセージ本文を取得して受注関連を抽出
  const me = await gget("/me?fields=user_id,username", token); // 認証チェック兼ねる
  const conv = await gget(
    `/me/conversations?platform=instagram&fields=id,updated_time&limit=${MAX_CONVERSATIONS}`,
    token
  );
  const conversations = (conv && conv.data) || [];
  const now = Date.now();
  const orders = [];

  for (const c of conversations) {
    try {
      const msgs = await gget(
        `/${c.id}?fields=messages.limit(20){id,created_time,from,message}`,
        token
      );
      const list = (msgs.messages && msgs.messages.data) || [];
      for (const m of list) {
        const t = m.created_time ? Date.parse(m.created_time) : now;
        if (now - t > RECENT_MS) continue;
        const body = String(m.message || "");
        const fromId = m.from && m.from.id;
        if (fromId && me.user_id && String(fromId) === String(me.user_id)) continue;
        if (ORDER_KEYWORDS.some((k) => body.includes(k))) {
          orders.push({
            who: (m.from && (m.from.username || m.from.id)) || "相手",
            body,
          });
        }
      }
    } catch (_) {
      /* 個別会話の失敗は無視して継続 */
    }
  }
  return { orders, scanned: conversations.length };
}

async function main() {
  const token = process.env.IG_DM_TOKEN;
  if (!token) {
    console.log("⏭️ IG_DM_TOKEN 未設定のためスキップ（DM自動化はトークン登録後に自動有効化）");
    return;
  }

  let result;
  try {
    result = await fetchOrders(token);
  } catch (e) {
    const note = `⚠️ DM取得に失敗（${e.message}）。トークン失効/蚕限の可能性 → 再ログインで長期トークンを再発行してください。`;
    console.log("⏭️ Instagram DM:", note);
    try {
      const board = await readFile(BOARD_PATH, "utf8");
      const updated = applyToBoard(board, buildSection([], 0, note));
      if (updated !== board) await writeFile(BOARD_PATH, updated, "utf8");
    } catch (_) {}
    return;
  }

  let board;
  try {
    board = await readFile(BOARD_PATH, "utf8");
  } catch (e) {
    console.log("⏭️ 運用ボード.md を読めずスキップ:", e.message);
    return;
  }

  const section = buildSection(result.orders, result.scanned, null);
  const updated = applyToBoard(board, section);
  if (updated !== board) await writeFile(BOARD_PATH, updated, "utf8");
  console.log(
    `📩 Instagram DM 会話${result.scanned}件を走査（受注関連の可能性${result.orders.length}件）を運用ボードに反映しました。`
  );
}

main().catch((e) => {
  console.log("⏭️ Instagram DMチェックで想定外エラー（スキップ）:", e.message);
  process.exit(0);
});
