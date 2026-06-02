// Chrome版Claudeの作業結果をリアルタイムで監視するwatchスクリプト。
// ~/claude_sync/progress.json が更新されるたびに内容をコンソールへ表示する。
//
// 使い方:
//   node scripts/watch_chrome_sync.mjs

import { readFileSync, watchFile } from "fs";
import { homedir } from "os";
import { join } from "path";

const SYNC_FILE = join(homedir(), "claude_sync", "progress.json");
let lastUpdated = "";

function printProgress() {
  try {
    const raw = readFileSync(SYNC_FILE, "utf8");
    const data = JSON.parse(raw);
    if (data.updated_at === lastUpdated) return;
    lastUpdated = data.updated_at;

    const ts = data.updated_at || "(時刻なし)";
    console.log(`\n[${ts}] ステータス: ${data.status}`);
    if (data.task) console.log(`  タスク: ${data.task}`);
    if (data.step) console.log(`  ステップ: ${data.step}`);
    if (data.result) console.log(`  結果:`, JSON.stringify(data.result, null, 2));
    if (data.error) console.log(`  エラー: ${data.error}`);
    if (data.log && data.log.length) {
      console.log(`  ログ:`);
      data.log.slice(-5).forEach((l) => console.log(`    - ${l}`));
    }
  } catch {
    // ファイルが一時的に読めない場合は無視
  }
}

console.log(`Chrome版Claude同期ウォッチャー起動中...`);
console.log(`監視ファイル: ${SYNC_FILE}`);
console.log(`Ctrl+C で停止\n`);

printProgress();
watchFile(SYNC_FILE, { interval: 1000 }, printProgress);
