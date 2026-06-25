// @imgly/background-removal-node を使ってローカルで背景透過する。
// APIキー不要・無料・制限なし。
//
// 使い方（単体実行）:
//   node scripts/bg_remove.mjs <入力ファイルパス> [出力ファイルパス]
//   # 出力先省略 → 同ディレクトリに {元ファイル名}_nobg.png で保存

import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { removeBackground } from "@imgly/background-removal-node";

/**
 * 画像バッファの背景を透過して PNG バッファを返す。
 * @param {Buffer} inputBuffer
 * @returns {Promise<Buffer>}
 */
export async function removeBg(inputBuffer) {
  const blob = new Blob([inputBuffer]);
  const resultBlob = await removeBackground(blob);
  return Buffer.from(await resultBlob.arrayBuffer());
}

// --- CLI エントリポイント ---
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("使い方: node scripts/bg_remove.mjs <入力ファイルパス> [出力ファイルパス]");
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1] ?? inputPath.replace(/(\.[^.]+)?$/, "_nobg.png");
  const inputBuffer = await readFile(inputPath);

  console.log(`背景透過中: ${basename(inputPath)}`);
  const outputBuffer = await removeBg(inputBuffer);
  await writeFile(outputPath, outputBuffer);

  console.log(JSON.stringify({ ok: true, input: inputPath, output: outputPath, bytes: outputBuffer.length }));
}

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error("エラー: " + String(e.message || e));
    process.exit(1);
  });
}
