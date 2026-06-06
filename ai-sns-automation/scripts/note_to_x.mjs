// note→X 同時投稿（クロスポスト）。
// noteのRSS(https://note.com/<NOTE_USERNAME>/rss)を監視し、
// 未投稿の新着記事をリンク付きでXへ投稿する。
//
// 重複防止: 投稿済みのRSS guid を「note連携」シートに記録し、それを除外する。
// 必要env: NOTE_USERNAME, X_*（投稿用）, GAS_WEBAPP_URL, GAS_SHARED_TOKEN
//
// 使い方:
//   node scripts/note_to_x.mjs            # 新着をXへ投稿
//   node scripts/note_to_x.mjs --dry-run  # 投稿せず対象だけ表示

import Parser from "rss-parser";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { postTweet } from "./lib/x_client.mjs";
import { callGas } from "./lib/ledger.mjs";
import { requireEnv, optionalEnv } from "./lib/env.mjs";

const NOTE_SHEET = "note連携";
// GASの「note連携」シートが使えない環境向けのフォールバック兼・永続記録。
// Gitにコミットすることで ephemeral コンテナを跨いで重複投稿を防ぐ。
const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCAL_RECORD = join(__dirname, "..", "data", "note_posted.json");
const dryRun = process.argv.includes("--dry-run");

// 投稿文テンプレート（環境変数で上書き可能）。{title} {link} を置換。
const template = optionalEnv("NOTE_X_TEMPLATE", "新しい記事を投稿しました📝\n{title}\n{link}");

function buildText(item) {
  return template.replace("{title}", item.title || "").replace("{link}", item.link || "");
}

async function readLocalRecords() {
  try {
    const arr = JSON.parse(await readFile(LOCAL_RECORD, "utf8"));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function getPostedGuids() {
  const posted = new Set();
  // GASの「note連携」シート（使えれば）。
  try {
    const json = await callGas({ action: "list", sheet: NOTE_SHEET });
    (json.rows || []).forEach((r) => posted.add(String(r["guid"] || "")));
  } catch (e) {
    // シートが無い場合などはローカル記録のみで続行する。
    console.error("note連携シートの読み込みに失敗（ローカル記録で継続）: " + e.message);
  }
  // ローカルの永続記録もマージ。
  (await readLocalRecords()).forEach((r) => posted.add(String(r.guid || "")));
  return posted;
}

async function recordPosted(item, xUrl) {
  const record = {
    guid: item.guid || item.link,
    title: item.title || "",
    link: item.link || "",
    postedAt: new Date().toISOString(),
    xPostUrl: xUrl,
  };
  // GASシートへ記録（使えれば）。失敗してもローカルに必ず残す。
  try {
    await callGas({ action: "append", sheet: NOTE_SHEET, values: record });
  } catch (e) {
    console.error("note連携シートへの記録に失敗（ローカルに保存）: " + e.message);
  }
  // ローカルの永続記録へ必ず追記。
  const records = await readLocalRecords();
  records.push(record);
  await mkdir(dirname(LOCAL_RECORD), { recursive: true });
  await writeFile(LOCAL_RECORD, JSON.stringify(records, null, 2) + "\n", "utf8");
}

async function main() {
  const { NOTE_USERNAME } = requireEnv(["NOTE_USERNAME"]);
  const feedUrl = `https://note.com/${NOTE_USERNAME}/rss`;

  const parser = new Parser();
  const feed = await parser.parseURL(feedUrl);
  const posted = await getPostedGuids();

  const fresh = (feed.items || []).filter((it) => !posted.has(String(it.guid || it.link)));

  if (fresh.length === 0) {
    console.log(JSON.stringify({ ok: true, posted: 0, message: "新着なし" }));
    return;
  }

  // 古い順に投稿する。
  fresh.reverse();

  const results = [];
  for (const item of fresh) {
    const text = buildText(item);
    if (dryRun) {
      results.push({ title: item.title, text, dryRun: true });
      continue;
    }
    try {
      const res = await postTweet({ text });
      await recordPosted(item, res.url);
      results.push({ title: item.title, xPostUrl: res.url });
    } catch (e) {
      results.push({ title: item.title, error: String(e.message || e) });
    }
  }

  console.log(JSON.stringify({ ok: true, posted: dryRun ? 0 : results.length, results }, null, 2));
}

main().catch((e) => {
  console.error("エラー: " + String(e.message || e));
  process.exit(1);
});
