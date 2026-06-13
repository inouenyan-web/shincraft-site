// 受信箱回収スクリプト（双方向ルーティンの「戻り」側）。
//
// コワーク・チャットが「AI報告受信箱」Docに書いた新着報告を GAS readDoc 経由で読み、
// 前回スナップショットとの差分（＝新着）を検知して、運用ボードの
// 「📥 受信箱からの新着（自動回収）」セクションへ転記する。
// これにより「コワーク/チャット → コード」方向が自動化され、一方通行ではなくなる。
//
// 実行: node scripts/process_inbox.mjs
// 必要env: GAS_WEBAPP_URL, GAS_SHARED_TOKEN
//   ※未設定 or GAS未再デプロイ(readDoc未対応)なら、何もせず正常終了する（graceful skip）。

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const BOARD_PATH = resolve(REPO_ROOT, "運用ボード.md");
const SNAPSHOT_PATH = resolve(__dirname, "../data/inbox_snapshot.txt");

const INBOX_DOC_ID = "1alE6ds2j-iGG-n_vG1wslVuZfo19q-z66ibJiLvd2_g";

function jstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace("T", " ");
}

async function readInboxViaGas() {
  const url = process.env.GAS_WEBAPP_URL;
  const token = process.env.GAS_SHARED_TOKEN;
  if (!url || !token) {
    console.log("⏭️  GAS_WEBAPP_URL / GAS_SHARED_TOKEN 未設定のためスキップ（受信箱回収は再デプロイ後に有効化）");
    return null;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, action: "readDoc", docId: INBOX_DOC_ID }),
    redirect: "follow",
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (_) {
    console.log("⏭️  GAS応答がJSONでないためスキップ:", text.slice(0, 120));
    return null;
  }
  if (!json.ok) {
    // 「未知のaction: readDoc」= GAS未再デプロイ。これは想定内なので静かにスキップ。
    console.log("⏭️  GAS readDoc 未対応のためスキップ（GAS再デプロイ後に有効）:", json.error);
    return null;
  }
  return json.content || "";
}

async function loadSnapshot() {
  try {
    return await readFile(SNAPSHOT_PATH, "utf8");
  } catch (_) {
    return "";
  }
}

// 受信箱全文のうち、前回スナップショット以降に追記された部分を「新着」とみなす。
function extractNewContent(current, snapshot) {
  if (!snapshot) {
    // 初回はテンプレ部分（自己申告依頼まで）を基準にし、それ以降を新着扱いにしない。
    return "";
  }
  if (current.startsWith(snapshot)) {
    return current.slice(snapshot.length).trim();
  }
  // 全置換されたケースなどは全文を新着として扱う（取りこぼし防止）。
  return current.trim();
}

function appendToBoard(board, newContent) {
  const stamp = jstNow();
  const block = [
    "",
    `### 📥 ${stamp} 受信箱からの新着（自動回収）`,
    "",
    "```",
    newContent,
    "```",
    "",
  ].join("\n");

  const marker = "## 🏃 進行中タスク";
  const idx = board.indexOf(marker);
  if (idx < 0) return board + "\n" + block;
  return board.slice(0, idx) + block + "\n" + board.slice(idx);
}

async function main() {
  const content = await readInboxViaGas();
  if (content === null) return; // graceful skip

  const snapshot = await loadSnapshot();
  const newContent = extractNewContent(content, snapshot);

  if (!newContent) {
    console.log("📭 受信箱に新着なし");
    await writeFile(SNAPSHOT_PATH, content, "utf8");
    return;
  }

  const board = await readFile(BOARD_PATH, "utf8");
  const updated = appendToBoard(board, newContent);
  await writeFile(BOARD_PATH, updated, "utf8");
  await writeFile(SNAPSHOT_PATH, content, "utf8");
  console.log(`📬 受信箱から新着を回収し運用ボードに転記しました（${newContent.length}文字）`);
}

await main();
