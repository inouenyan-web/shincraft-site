// noteシリーズ管理ツール。
// data/note_series.json を台帳として、下書き〜投稿〜告知までのフローを管理する。
//
// 使い方:
//   node scripts/note_series.mjs status                    # 全記事の進捗を表示
//   node scripts/note_series.mjs check                     # RSSで新着公開を検出 → X投稿済みフラグ更新
//   node scripts/note_series.mjs register <id> <note-url>  # 記事URLを手動登録（投稿後に実行）
//   node scripts/note_series.mjs promote <id>              # Instagram告知文を生成
//
// 必要env: NOTE_USERNAME（shincrft系）, NOTE_USERNAME_OSHIN（oshin系、任意）
// X実投稿は note_to_x.mjs に委任。このスクリプトはステータス管理と告知文生成が主役。

import Parser from "rss-parser";
import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { optionalEnv } from "./lib/env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "../data/note_series.json");

async function loadSeries() {
  const raw = await readFile(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

async function saveSeries(data) {
  data.updated_at = new Date().toISOString();
  await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function statusEmoji(article) {
  if (article.instagram_promoted) return "✅";
  if (article.x_posted) return "📢";
  if (article.note_url) return "📝";
  if (article.status === "下書き完了") return "📄";
  return "💡";
}

function statusLabel(article) {
  if (article.instagram_promoted) return "告知済み";
  if (article.x_posted) return "X投稿済み";
  if (article.note_url) return "note投稿済み（X未投稿）";
  if (article.status === "下書き完了") return "下書き完了（未投稿）";
  return article.status || "企画中";
}

// ──────────────── status ────────────────
async function cmdStatus() {
  const data = await loadSeries();
  const bySeries = {};
  for (const a of data.series) {
    (bySeries[a.series] ??= []).push(a);
  }

  console.log("\n=== noteシリーズ 進捗ダッシュボード ===");
  console.log(`更新: ${data.updated_at}\n`);

  for (const [seriesName, articles] of Object.entries(bySeries)) {
    console.log(`【${seriesName}】`);
    for (const a of articles) {
      const em = statusEmoji(a);
      const label = statusLabel(a);
      console.log(`  ${em} [${a.id}] ${a.title}`);
      console.log(`     状態: ${label}  価格: ${a.price}`);
      if (a.note_url) console.log(`     URL: ${a.note_url}`);
      if (a.published_at) console.log(`     投稿日: ${a.published_at}`);
    }
    console.log();
  }

  const total = data.series.length;
  const published = data.series.filter((a) => a.note_url).length;
  const xPosted = data.series.filter((a) => a.x_posted).length;
  const instaPromoted = data.series.filter((a) => a.instagram_promoted).length;

  console.log(`合計 ${total}本 | note投稿済み ${published}本 | X連携済み ${xPosted}本 | Instagram告知済み ${instaPromoted}本`);
  console.log();

  // 次アクション候補を提示
  const needsXPost = data.series.filter((a) => a.note_url && !a.x_posted);
  const needsPromo = data.series.filter((a) => a.x_posted && !a.instagram_promoted);
  const readyToDraft = data.series.filter((a) => !a.note_url && a.status === "下書き完了");

  if (needsXPost.length > 0) {
    console.log("▶ X未投稿あり（`check` を実行してX連携）:");
    for (const a of needsXPost) console.log(`  - [${a.id}] ${a.title}`);
    console.log();
  }
  if (needsPromo.length > 0) {
    console.log("▶ Instagram告知未対応（`promote <id>` で告知文を生成）:");
    for (const a of needsPromo) console.log(`  - [${a.id}] ${a.title}`);
    console.log();
  }
  if (readyToDraft.length > 0) {
    console.log("▶ noteへの投稿待ち記事（下書き完了）:");
    for (const a of readyToDraft) console.log(`  - [${a.id}] ${a.title}  (${a.file})`);
    console.log("  → noteエディタに貼り付けて投稿後、`register <id> <URL>` で登録してください");
    console.log();
  }
}

// ──────────────── check ────────────────
async function cmdCheck() {
  const data = await loadSeries();
  const parser = new Parser();

  // アカウントごとにRSSをまとめて取得
  const accounts = new Set(
    data.series.map((a) => process.env[a.note_account] || "").filter(Boolean)
  );

  if (accounts.size === 0) {
    console.log("NOTE_USERNAME 等が未設定のためRSSチェックをスキップします。");
    console.log("記事URLが手元にある場合は `register <id> <URL>` で登録してください。");
    return;
  }

  let updated = 0;
  for (const username of accounts) {
    let feed;
    try {
      feed = await parser.parseURL(`https://note.com/${username}/rss`);
    } catch (e) {
      console.error(`RSSの取得に失敗 (${username}): ${e.message}`);
      continue;
    }

    for (const item of feed.items || []) {
      const url = item.link || "";
      // タイトルが部分一致する記事を探して投稿済みを検出
      for (const article of data.series) {
        if (article.note_url || !article.title) continue;
        // タイトルの最初の10文字で緩くマッチ
        const keyTitle = article.title.slice(0, 12).replace(/\s/g, "");
        const feedTitle = (item.title || "").replace(/\s/g, "");
        if (feedTitle.includes(keyTitle)) {
          article.note_url = url;
          article.published_at = item.pubDate
            ? new Date(item.pubDate).toISOString()
            : new Date().toISOString();
          article.status = "投稿済み";
          console.log(`✅ 新着を検出: [${article.id}] ${article.title}`);
          console.log(`   URL: ${url}`);
          console.log(`   → note_to_x.mjs を実行してX投稿してください。`);
          updated++;
        }
      }
    }
  }

  if (updated > 0) {
    await saveSeries(data);
    console.log(`\n${updated}件 更新しました。`);
  } else {
    console.log("新着の投稿は検出されませんでした。");
  }
}

// ──────────────── register ────────────────
async function cmdRegister(id, url) {
  if (!id || !url) {
    console.error("使い方: note_series.mjs register <id> <note-url>");
    process.exit(1);
  }
  const data = await loadSeries();
  const article = data.series.find((a) => a.id === id);
  if (!article) {
    console.error(`ID が見つかりません: ${id}`);
    console.error("有効なID: " + data.series.map((a) => a.id).join(", "));
    process.exit(1);
  }

  article.note_url = url;
  article.status = "投稿済み";
  article.published_at ??= new Date().toISOString();
  await saveSeries(data);

  console.log(`✅ 登録完了: [${id}] ${article.title}`);
  console.log(`   URL: ${url}`);
  console.log();
  console.log("次のステップ:");
  console.log("  1. X投稿:          cd ai-sns-automation && node scripts/note_to_x.mjs");
  console.log("  2. Instagram告知:  cd ai-sns-automation && node scripts/note_series.mjs promote " + id);
}

// ──────────────── promote ────────────────
async function cmdPromote(id) {
  if (!id) {
    console.error("使い方: note_series.mjs promote <id>");
    process.exit(1);
  }
  const data = await loadSeries();
  const article = data.series.find((a) => a.id === id);
  if (!article) {
    console.error(`ID が見つかりません: ${id}`);
    process.exit(1);
  }
  if (!article.note_url) {
    console.error(`note_url が未登録です。先に register してください。`);
    process.exit(1);
  }

  const url = article.note_url;
  const title = article.title;

  // ShinCRAFT向けとoshin向けでトーンを変える
  let instaText, xText;
  if (article.series === "shincraft") {
    instaText = `新しい記事を書きました📝\n\n「${title}」\n\n発信が続かない…写真は撮れるのに投稿できない…\nそんな悩みを、根性じゃなく仕組みで解決した実体験をまとめました。\n\nスマホ1台・承認ボタンを押すだけで毎日投稿できる方法、ぜひ読んでみてください🙌\n\n▶ プロフィールのリンクからどうぞ\n\n#ハンドメイド作家 #SNS発信 #AI活用 #個人事業主 #自動化`;
    xText = `新記事📝「${title}」\n発信が続かない問題を仕組みで解決した実体験まとめました。\n${url}`;
  } else {
    instaText = `新しい記事を書きました📝\n\n「${title}」\n\n病院で働く"中の人"しか知らない話を正直に書きました。\n就職・転職を考えてる方に読んでほしいです。\n\n▶ プロフィールのリンクからどうぞ\n\n#医療事務 #転職 #病院で働く #実話エッセイ #キャリア`;
    xText = `新記事📝「${title}」\n病院の中の人だから書けるリアルな話。\n${url}`;
  }

  console.log("\n=== Instagram 告知文 ===");
  console.log(instaText);
  console.log("\n=== X 告知文 ===");
  console.log(xText);
  console.log("\n---");
  console.log("これをそのまま使うか、/sns でInstagram投稿パイプラインに流してください。");
  console.log("告知済みにする場合: note_series.mjs mark-promoted " + id);
}

// ──────────────── mark-promoted ────────────────
async function cmdMarkPromoted(id) {
  if (!id) {
    console.error("使い方: note_series.mjs mark-promoted <id>");
    process.exit(1);
  }
  const data = await loadSeries();
  const article = data.series.find((a) => a.id === id);
  if (!article) {
    console.error(`ID が見つかりません: ${id}`);
    process.exit(1);
  }
  article.instagram_promoted = true;
  await saveSeries(data);
  console.log(`✅ [${id}] Instagram告知済みにしました。`);
}

// ──────────────── main ────────────────
const [, , cmd, arg1, arg2] = process.argv;

switch (cmd) {
  case "status":
  case undefined:
    await cmdStatus();
    break;
  case "check":
    await cmdCheck();
    break;
  case "register":
    await cmdRegister(arg1, arg2);
    break;
  case "promote":
    await cmdPromote(arg1);
    break;
  case "mark-promoted":
    await cmdMarkPromoted(arg1);
    break;
  default:
    console.error(`不明なコマンド: ${cmd}`);
    console.error("使えるコマンド: status / check / register / promote / mark-promoted");
    process.exit(1);
}
