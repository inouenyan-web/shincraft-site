// 毎朝6時（JST）の「全AI報告会」資料を自動生成し、リポジトリ直下の
// AI共有ブリーフィング_最新.md として書き出す（ワークフローがコミットする）。
// 参加者：Claude Code各セッション（コード）・Chrome版Claude（チャット）・コワーク・ChatGPT。
//
// 公開リポジトリのためURLを開くだけで全AIが読める：
//   https://github.com/inouenyan-web/shincraft-site/blob/main/AI共有ブリーフィング_最新.md
//
// 報告会の内容：
//   ① 各班がいま何を担当しているか（運用ボードの進行中タスク・優先順位）
//   ② 井上さんからどんな指摘を受けたか（LESSONS.md 全文）
//   ③ 井上さんの考えの理解＝確立された行動原則（LESSONS.mdの行動原則）
//
// 実行: node scripts/daily_briefing.mjs
// 環境変数は不要（GAS非依存・リポジトリ内で完結）

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');
const OUT_PATH = resolve(REPO_ROOT, 'AI共有ブリーフィング_最新.md');

const today = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
const lessons = await readFile(resolve(REPO_ROOT, 'LESSONS.md'), 'utf8');
const board = await readFile(resolve(REPO_ROOT, '運用ボード.md'), 'utf8');

const briefing = [
  `# 朝6時 全AI報告会（${today} 自動開催）`,
  '',
  '> **参加者：コード（Claude Code各セッション）／チャット（Chrome版Claude）／コワーク／ChatGPT**',
  '> 各AIは作業開始前にこの報告会資料を必ず読み、以下を自分の頭に同期すること：',
  '> ① いま誰が何を担当しているか（下記・運用ボード）',
  '> ② 井上さんからどんな指摘を受けたか（下記・LESSONS）',
  '> ③ 井上さんの考え＝確立された行動原則（LESSONSの行動原則。違反したまま作業を始めない）',
  '>',
  '> **井上さんに同じ説明を二度させないことが、この報告会の存在理由である。**',
  '',
  '---',
  '',
  '## 第1部：井上さんからの指摘と行動原則（全員共通の学習）',
  '',
  lessons,
  '',
  '---',
  '',
  '## 第2部：現在の担当・優先順位・進行状況（運用ボード）',
  '',
  board,
].join('\n');

await writeFile(OUT_PATH, briefing, 'utf8');
console.log(`✅ 朝6時 全AI報告会の資料を生成しました（${today}）→ AI共有ブリーフィング_最新.md`);

// GAS経由でDriveのGoogle Docを上書き（コワーク・Chrome版が読む）
const gasUrl = process.env.GAS_WEBAPP_URL;
const gasToken = process.env.GAS_SHARED_TOKEN;
const BRIEFING_DOC_ID = '1nItOD505h2CHEMd_xjUtPaupAF0QNHR-u1IMhf0cGf0';
if (gasUrl && gasToken) {
  const res = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: gasToken, action: 'writeToDoc', docId: BRIEFING_DOC_ID, content: briefing }),
  });
  const data = await res.json();
  if (data.ok) {
    console.log('✅ DriveのAI共有ブリーフィング_最新 を更新しました。');
  } else {
    console.error('⚠️ Drive更新失敗:', data.error);
    process.exit(1);
  }
} else {
  console.log('⚠️ GAS_WEBAPP_URL/GAS_SHARED_TOKEN 未設定 — Drive転送をスキップ');
}
