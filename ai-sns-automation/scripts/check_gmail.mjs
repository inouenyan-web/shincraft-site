// Gmail (shincraft2023) の直近の未読メールを取得し、受注関連を運用ボード.md へタスク化するスクリプト。
//
// 必要env: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
// ・未設定 / 認証失敗 / API失敗 のときは何もせず正常終了（graceful skip）＝ワークフローを落とさない。
// ・スコープは gmail.readonly（読み取りのみ）。トークン値はログに出さない。
//
// 実行: node scripts/check_gmail.mjs

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const BOARD_PATH = resolve(REPO_ROOT, "運用ボード.md");

const START = "<!-- GMAIL_INBOX:START -->";
const END = "<!-- GMAIL_INBOX:END -->";

const ORDER_KEYWORDS = [
  "受注", "注文", "ご注文", "発注", "オーダー", "見積", "お見積", "見積もり",
  "納期", "在庫", "数量", "名入れ", "購入", "注文書", "見積書", "請求", "order", "invoice", "quote",
];

// 直近何時間ぶんの未読を見るか（1日4回＝6h間隔なので余裕をもって取得）
const QUERY = "is:unread newer_than:1d";
const MAX = 25;

function jstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}

const oneLine = (s, n = 90) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t || "（件名なし）";
};

async function getAccessToken(id, secret, refresh) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("token endpoint status " + res.status);
  const json = await res.json();
  if (!json.access_token) throw new Error("no access_token");
  return json.access_token;
}

async function listMessageIds(accessToken) {
  const url =
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=" +
    MAX +
    "&q=" +
    encodeURIComponent(QUERY);
  const res = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
  if (!res.ok) throw new Error("messages.list status " + res.status);
  const json = await res.json();
  return (json.messages || []).map((m) => m.id);
}

async function getMessageMeta(accessToken, id) {
  const url =
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/" +
    id +
    "?format=metadata&metadataHeaders=From&metadataHeaders=Subject";
  const res = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
  if (!res.ok) throw new Error("messages.get status " + res.status);
  const json = await res.json();
  const headers = (json.payload && json.payload.headers) || [];
  const get = (name) => (headers.find((h) => h.name === name) || {}).value || "";
  return { from: get("From"), subject: get("Subject"), snippet: json.snippet || "" };
}

function buildSection(mails) {
  const stamp = jstNow();
  const orders = mails.filter((m) =>
    ORDER_KEYWORDS.some((k) => (m.subject + " " + m.snippet).includes(k))
  );

  const lines = [START, `### 📧 ${stamp} Gmail 新着チェック（自動 / shincraft2023）`, ""];
  lines.push(`直近24h未読 ${mails.length}件 / うち受注関連の可能性 ${orders.length}件`);
  lines.push("");
  if (orders.length) {
    lines.push("**🧾 受注関連の可能性（要対応・チェックでクローズ）:**");
    for (const m of orders.slice(0, 20)) {
      const from = oneLine(m.from, 40);
      lines.push(`- [ ] ${from} ｜ ${oneLine(m.subject, 60)}`);
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
  const id = process.env.GMAIL_CLIENT_ID;
  const secret = process.env.GMAIL_CLIENT_SECRET;
  const refresh = process.env.GMAIL_REFRESH_TOKEN;
  if (!id || !secret || !refresh) {
    console.log("⏭️ GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN 未設定のためスキップ");
    return;
  }

  let accessToken;
  try {
    accessToken = await getAccessToken(id, secret, refresh);
  } catch (e) {
    console.log("⏭️ Gmailアクセストークン取得に失敗（スキップ）:", e.message);
    return;
  }

  let mails = [];
  try {
    const ids = await listMessageIds(accessToken);
    for (const mid of ids) {
      try {
        mails.push(await getMessageMeta(accessToken, mid));
      } catch (_) {
        /* 個別メールの取得失敗は無視 */
      }
    }
  } catch (e) {
    console.log("⏭️ Gmail一覧取得に失敗（スキップ）:", e.message);
    return;
  }

  let board;
  try {
    board = await readFile(BOARD_PATH, "utf8");
  } catch (e) {
    console.log("⏭️ 運用ボード.md を読めずスキップ:", e.message);
    return;
  }

  const section = buildSection(mails);
  const updated = applyToBoard(board, section);
  if (updated !== board) {
    await writeFile(BOARD_PATH, updated, "utf8");
  }
  const orders = mails.filter((m) =>
    ORDER_KEYWORDS.some((k) => (m.subject + " " + m.snippet).includes(k))
  ).length;
  console.log(`📧 Gmail 未読${mails.length}件（受注関連の可能性${orders}件）を運用ボードに反映しました。`);
}

main().catch((e) => {
  console.log("⏭️ Gmailチェックで想定外エラー（スキップ）:", e.message);
  process.exit(0);
});
