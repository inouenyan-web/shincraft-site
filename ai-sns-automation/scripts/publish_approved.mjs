// 承認済み投稿をXへ公開する。
// 「投稿管理」シートで ステータス=承認 の行を対象に、X本文（+ハッシュタグ）を投稿し、
// X投稿URL と ステータス=投稿済み を台帳へ書き戻す。
//
// 画像添付: ATTACH_IMAGE=1 のとき「生成画像URL」が直接取得可能な画像URLなら添付を試みる。
//   Google Driveの共有URLは直接取得できないことが多い。確実に添付したい場合は、
//   Claude CodeがDrive MCPで画像をDLし、scripts/post_to_x.mjs --image で個別投稿する。
//
// 必要env: X_*, GAS_WEBAPP_URL, GAS_SHARED_TOKEN
//
// 使い方:
//   node scripts/publish_approved.mjs            # 承認行をXへ投稿
//   node scripts/publish_approved.mjs --dry-run  # 投稿せず対象だけ表示

import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { postTweet } from "./lib/x_client.mjs";
import { listRowsByStatus, updateRowByManagementId } from "./lib/ledger.mjs";
import { optionalEnv } from "./lib/env.mjs";

const dryRun = process.argv.includes("--dry-run");
const attachImage = optionalEnv("ATTACH_IMAGE", "") === "1";

function composeText(row) {
  const body = String(row["X本文"] || "").trim();
  const tags = String(row["ハッシュタグ"] || "").trim();
  return tags ? `${body}\n\n${tags}` : body;
}

async function maybeDownloadImage(url) {
  if (!attachImage || !url || !/^https?:\/\//.test(url)) return undefined;
  try {
    const res = await fetch(url, { redirect: "follow" });
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return undefined; // 画像でなければ添付しない
    const buf = Buffer.from(await res.arrayBuffer());
    const dir = await mkdtemp(join(tmpdir(), "sns-"));
    const ext = ct.includes("png") ? "png" : "jpg";
    const p = join(dir, `image.${ext}`);
    await writeFile(p, buf);
    return p;
  } catch (_) {
    return undefined;
  }
}

const rows = await listRowsByStatus("承認");
if (rows.length === 0) {
  console.log(JSON.stringify({ ok: true, published: 0, message: "承認済みの投稿はありません" }));
  process.exit(0);
}

const results = [];
for (const row of rows) {
  const managementId = row["管理ID"];
  const text = composeText(row);

  if (!text) {
    results.push({ managementId, skipped: "X本文が空" });
    continue;
  }

  if (dryRun) {
    results.push({ managementId, text, dryRun: true });
    continue;
  }

  try {
    const imagePath = await maybeDownloadImage(row["生成画像URL"]);
    const res = await postTweet({ text, imagePath });
    await updateRowByManagementId(managementId, {
      "X投稿URL": res.url,
      "ステータス": "投稿済み",
    });
    results.push({ managementId, xPostUrl: res.url });
  } catch (e) {
    await updateRowByManagementId(managementId, {
      "ステータス": "エラー",
      "エラー内容": String(e.message || e),
    }).catch(() => {});
    results.push({ managementId, error: String(e.message || e) });
  }
}

console.log(JSON.stringify({ ok: true, published: dryRun ? 0 : results.length, results }, null, 2));
