// ローカルファイルの背景透過スクリプト。
// 引数: node scripts/bg_remove_local.mjs <入力ファイルパス> <出力ファイルパス>
import { removeBackground } from "@imgly/background-removal-node";
import { readFileSync, writeFileSync } from "fs";

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("使い方: node bg_remove_local.mjs <input> <output>");
  process.exit(1);
}

const inputBuffer = readFileSync(inputPath);
const ext = inputPath.split(".").pop().toLowerCase();
const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
const blob = new Blob([inputBuffer], { type: mime });
const result = await removeBackground(blob);
const arrayBuffer = await result.arrayBuffer();
writeFileSync(outputPath, Buffer.from(arrayBuffer));
console.log(`完了: ${outputPath}`);
