// 受信箱の未対応タスクを集約し、/inbox 形式でレポートする。
// GITHUB_STEP_SUMMARY に出力（tee経由）し、CHATWORK_API_TOKEN があれば My Chat にも投稿。
// 実行タイミング：全チェックスクリプト完了後（運用ボード.md 更新済みの状態）。

import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const BOARD_PATH = resolve(REPO_ROOT, "運用ボード.md");

function extractSection(content, startTag, endTag) {
  const s = content.indexOf(startTag);
  const e = content.indexOf(endTag);
  if (s === -1 || e === -1) return "";
  return content.slice(s + startTag.length, e);
}

const board = await readFile(BOARD_PATH, "utf8");

const SECTIONS = [
  { tag: "IG_DM_MANUAL",  label: "IG DM" },
  { tag: "GMAIL_INBOX",   label: "Gmail" },
  { tag: "CHATWORK_INBOX",label: "Chatwork" },
  { tag: "IG_DM_INBOX",   label: "IG DM(自動)" },
];

const allPending = [];
for (const { tag, label } of SECTIONS) {
  const content = extractSection(board, `<!-- ${tag}:START -->`, `<!-- ${tag}:END -->`);
  for (const line of content.split("\n")) {
    if (line.trim().startsWith("- [ ]")) {
      allPending.push({ label, text: line.trim() });
    }
  }
}

const red    = allPending.filter(i => i.text.includes("🔴") || i.text.includes("未返信") || i.text.includes("要返信"));
const yellow = allPending.filter(i => !red.includes(i) && (i.text.includes("🟡") || i.text.match(/受注|注文|フォロー|素材/)));
const others = allPending.filter(i => !red.includes(i) && !yellow.includes(i));

const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
const mdLines = [];
mdLines.push(`## /inbox 受注チェック（${now} JST）`);
mdLines.push("");

if (red.length) {
  mdLines.push("### ① 🔴 要対応（未返信）");
  for (const { label, text } of red)    mdLines.push(`- **[${label}]** ${text.replace(/^- \[ \] /, "")}`);
  mdLines.push("");
}
if (yellow.length) {
  mdLines.push("### ② 🟡 受注関連・フォロー");
  for (const { label, text } of yellow) mdLines.push(`- [${label}] ${text.replace(/^- \[ \] /, "")}`);
  mdLines.push("");
}
if (others.length) {
  mdLines.push("### ③ その他（確認）");
  for (const { label, text } of others) mdLines.push(`- [${label}] ${text.replace(/^- \[ \] /, "")}`);
  mdLines.push("");
}
if (!allPending.length) {
  mdLines.push("✅ 未対応タスクなし");
  mdLines.push("");
}

console.log(mdLines.join("\n"));

// Chatwork My Chat への投稿（未対応あり かつ APIトークンあり のみ）
const token = process.env.CHATWORK_API_TOKEN;
if (!token) {
  console.log("ℹ️ CHATWORK_API_TOKEN 未設定 — Chatwork投稿スキップ");
} else if (!allPending.length) {
  console.log("✅ 未対応なし — Chatwork投稿なし");
} else {
  try {
    const roomsRes = await fetch("https://api.chatwork.com/v2/rooms", {
      headers: { "X-ChatWorkToken": token },
    });
    if (!roomsRes.ok) throw new Error(`rooms: ${roomsRes.status}`);
    const rooms = await roomsRes.json();
    const myRoom = rooms.find(r => r.type === "my");
    if (!myRoom) throw new Error("My Chatルームが見つかりません");

    const cwText = [
      `/inbox 受注チェック（${now} JST）`,
      "",
      ...(red.length    ? ["[警告] 要対応（未返信）",    ...red.map(i    => `・[${i.label}] ${i.text.replace(/^- \[ \] /, "").replace(/🔴 /g, "")}`), ""] : []),
      ...(yellow.length ? ["[お知らせ] 受注関連・フォロー", ...yellow.map(i => `・[${i.label}] ${i.text.replace(/^- \[ \] /, "").replace(/🟡 /g, "")}`), ""] : []),
      ...(others.length ? ["その他（確認）",               ...others.map(i => `・[${i.label}] ${i.text.replace(/^- \[ \] /, "")}`), ""] : []),
    ].join("\n");

    const postRes = await fetch(
      `https://api.chatwork.com/v2/rooms/${myRoom.room_id}/messages`,
      {
        method: "POST",
        headers: { "X-ChatWorkToken": token, "Content-Type": "application/x-www-form-urlencoded" },
        body: `body=${encodeURIComponent(cwText)}`,
      }
    );
    if (!postRes.ok) throw new Error(`messages: ${postRes.status}`);
    console.log(`✅ Chatwork My Chat にレポートを投稿しました（room_id=${myRoom.room_id}）`);
  } catch (e) {
    console.log(`⚠️ Chatwork投稿スキップ: ${e.message}`);
  }
}
