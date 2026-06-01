// PhotoRoom API で画像の背景を透過する。
//
// 使い方（単体実行）:
//   node scripts/photoroom.mjs <入力ファイルパス> [出力ファイルパス]
//   # 出力先省略 → 同ディレクトリに {元ファイル名}_nobg.png で保存
//
//   node scripts/photoroom.mjs --ledger [--dry-run]
//   # 台帳の「未確認」行のうち 背景透過画像URL が空の行をまとめて処理
//   # 実際のダウンロード/アップロードは Claude Code（Drive MCP）が担う
//   # このモードは「処理すべき行のリスト」を出力するだけ
//
// 必要env: PHOTOROOM_API_KEY
// 許可ホスト: sdk.photoroom.com

import { readFile, writeFile } from "node:fs/promises";
import { basename, join, extname } from "node:path";
import { requireEnv } from "./lib/env.mjs";
import { listRows } from "./lib/ledger.mjs";

const PHOTOROOM_URL = "https://sdk.photoroom.com/v1/segment";
const dryRun = process.argv.includes("--dry-run");
const ledgerMode = process.argv.includes("--ledger");

/**
 * PhotoRoom API で背景透過処理する。
 * @param {Buffer} imageBuffer 入力画像バイナリ
 * @param {string} filename 元ファイル名（拡張子付き）
 * @returns {Promise<Buffer>} 透過PNG のバイナリ
 */
export async function removeBackground(imageBuffer, filename) {
  const { PHOTOROOM_API_KEY } = requireEnv(["PHOTOROOM_API_KEY"]);

  const form = new FormData();
  const mimeType = filename.match(/\.(png)$/i) ? "image/png" : "image/jpeg";
  form.append("image_file", new Blob([imageBuffer], { type: mimeType }), filename);

  const res = await fetch(PHOTOROOM_URL, {
    method: "POST",
    headers: { "x-api-key": PHOTOROOM_API_KEY },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PhotoRoom APIエラー ${res.status}: ${text.slice(0, 300)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

/**
 * ファイルパスを指定して背景透過し、PNG として保存する。
 * @param {string} inputPath 入力ファイルパス
 * @param {string} [outputPath] 省略時は {元ファイル名}_nobg.png
 * @returns {Promise<string>} 出力ファイルパス
 */
export async function processFile(inputPath, outputPath) {
  const filename = basename(inputPath);
  const outPath = outputPath ?? inputPath.replace(/(\.[^.]+)?$/, "_nobg.png");

  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, input: inputPath, output: outPath }));
    return outPath;
  }

  const inputBuffer = await readFile(inputPath);
  const resultBuffer = await removeBackground(inputBuffer, filename);
  await writeFile(outPath, resultBuffer);

  console.log(JSON.stringify({ ok: true, input: inputPath, output: outPath, bytes: resultBuffer.length }));
  return outPath;
}

// --- ledger モード: 未処理行の一覧を出力 ---
async function ledgerList() {
  const rows = await listRows();
  const targets = rows.filter(
    (r) =>
      String(r["ステータス"] || "").trim() === "未確認" &&
      String(r["元画像URL"] || "").trim() !== "" &&
      String(r["背景透過画像URL"] || "").trim() === ""
  );

  console.log(
    JSON.stringify(
      {
        message: "背景透過未処理の行",
        count: targets.length,
        rows: targets.map((r) => ({
          管理ID: r["管理ID"],
          商品名: r["商品名"],
          元画像URL: r["元画像URL"],
        })),
      },
      null,
      2
    )
  );
}

// --- CLI エントリポイント ---
async function main() {
  if (ledgerMode) {
    await ledgerList();
    return;
  }

  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (args.length === 0) {
    console.error("使い方: node scripts/photoroom.mjs <入力ファイルパス> [出力ファイルパス]");
    console.error("        node scripts/photoroom.mjs --ledger [--dry-run]");
    process.exit(1);
  }

  await processFile(args[0], args[1]);
}

main().catch((e) => {
  console.error("エラー: " + String(e.message || e));
  process.exit(1);
});
