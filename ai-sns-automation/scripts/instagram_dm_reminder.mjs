// Instagram DM 手動チェックのリマインドを運用ボード.mdへ反映するスクリプト。
//
// Instagram の DM(ダイレクトメッセージ)は Graph API の対象外で、
// instagram_manage_messages 権限(Meta App Review)が無いと自動取得できない。
// そのため当面は「手動チェックのリマインド＋Chrome版Claude用プロンプト」を
// 運用ボードに常時最新の形で表示し、受注DMの見落としを防ぐ。
//
// 実行: node scripts/instagram_dm_reminder.mjs
// 依存env: なし（運用ボード.md を直接更新するだけ）

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const BOARD_PATH = resolve(REPO_ROOT, "運用ボード.md");

const START = "<!-- IG_DM_REMINDER:START -->";
const END = "<!-- IG_DM_REMINDER:END -->";

function jstNow() {
  return new Date(Date.now() + 9 * 3600 * 1000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
}

function buildSection() {
  const stamp = jstNow();
  const prompt = [
    "@shincraft2023 のInstagramの「DM(ダイレクトメッセージ)」を確認し、受注・見積・在庫・納期に関するやり取りを抽出してください。",
    "",
    "【抽出してほしいもの】",
    "- 受注/注文の依頼・確定（商品名・数量・名入れ内容・希望納期）",
    "- 見積・価格の問い合わせ",
    "- 進行中案件の催促・変更・キャンセル",
    "- 未返信で放置されている受注関連DM",
    "",
    "各項目を「相手アカウント / 内容要約 / 次にやること(ToDo) / 期限」の形で箇条書きにしてください。",
  ].join("\n");

  return [
    START,
    `### 📩 ${stamp} Instagram DM 手動チェック（自動リマインド）`,
    "",
    "> InstagramのDMはAPI(Graph API)では取得できないため自動チェック対象外です。",
    "> instagram_manage_messages 権限(Meta App Review)の承認後に自動取得へ切替予定。",
    "> それまでは下記プロンプトをChrome版Claudeに貼り、DMの受注案件を確認してください。",
    "",
    "```",
    prompt,
    "```",
    END,
  ].join("\n");
}

async function main() {
  let board;
  try {
    board = await readFile(BOARD_PATH, "utf8");
  } catch (e) {
    console.error("運用ボード.md を読めませんでした:", e.message);
    process.exit(1);
  }

  const section = buildSection();
  let updated;
  const s = board.indexOf(START);
  const e = board.indexOf(END);
  if (s !== -1 && e !== -1 && e > s) {
    // 既存リマインドを最新に置き換え（毎回の重複追記を防ぐ）
    updated = board.slice(0, s) + section + board.slice(e + END.length);
  } else {
    // 「進行中タスク」見出しの直前に挿入（無ければ末尾に追加）
    const marker = "## 🏃 進行中タスク";
    const idx = board.indexOf(marker);
    const block = section + "\n\n";
    updated =
      idx >= 0
        ? board.slice(0, idx) + block + board.slice(idx)
        : board + "\n\n" + block;
  }

  if (updated !== board) {
    await writeFile(BOARD_PATH, updated, "utf8");
    console.log("📩 Instagram DM 手動チェックのリマインドを運用ボードに反映しました。");
  } else {
    console.log("📩 リマインドに変更なし。");
  }
}

await main();
