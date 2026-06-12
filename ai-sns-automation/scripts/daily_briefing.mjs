// 毎朝6時（JST）に LESSONS.md と 運用ボード.md を結合した共有ブリーフィングを
// Google Drive（AI親フォルダ）へアップロードする。
// 全AI（Chrome版Claude・コワーク・ChatGPT等）はDriveのこのファイルを読んで足並みを揃える。
//
// 必要env: GAS_WEBAPP_URL, GAS_SHARED_TOKEN
// 実行: node scripts/daily_briefing.mjs

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireEnv } from './lib/env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');
const AI_FOLDER_ID = '1Nl5ksVJuwEuDZgyb0jr9V6Os9YLzGBcj'; // AI親フォルダ（CLAUDE.md固定ID）

const env = requireEnv(['GAS_WEBAPP_URL', 'GAS_SHARED_TOKEN']);

const today = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
const lessons = await readFile(resolve(REPO_ROOT, 'LESSONS.md'), 'utf8');
const board = await readFile(resolve(REPO_ROOT, '運用ボード.md'), 'utf8');

const briefing = [
  `# AI共有ブリーフィング（${today} 6:00 自動生成）`,
  '',
  '> 全AI（Chrome版Claude・コワーク・ChatGPT・Claude Code各セッション）は',
  '> 作業開始前にこのファイルを読み、指摘事項と現在の優先順位に従うこと。',
  '',
  '---',
  '',
  lessons,
  '',
  '---',
  '',
  board,
].join('\n');

const res = await fetch(env.GAS_WEBAPP_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: env.GAS_SHARED_TOKEN,
    action: 'uploadFile',
    folderId: AI_FOLDER_ID,
    fileName: 'AI共有ブリーフィング_最新.md',
    base64: Buffer.from(briefing, 'utf8').toString('base64'),
    mimeType: 'text/markdown',
  }),
});

const data = await res.json().catch(() => ({}));
if (!res.ok || data.error) {
  throw new Error(`ブリーフィングのアップロードに失敗: HTTP ${res.status} ${JSON.stringify(data)}`);
}
console.log(`✅ AI共有ブリーフィングをDriveへ配置しました（${today}）`);
console.log(JSON.stringify(data));
