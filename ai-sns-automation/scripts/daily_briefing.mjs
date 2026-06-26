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
// 環境変数: GAS_WEBAPP_URL / GAS_SHARED_TOKEN を設定すると、DriveのGoogle Docへも転送する。
//          未設定ならローカルの md 生成のみで正常終了（Drive転送は静かにスキップ）。
//          ※ワークフロー側で env を渡さないと「常にスキップ＝偽green」になるので注意。

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

// ブリーフィングの「正本」は公開GitHub URL（このmdをワークフローがコミットする）。
// 全AIはここを読めば常に最新（資格情報・Drive不要）:
const BRIEFING_GH_URL = 'https://github.com/inouenyan-web/shincraft-site/blob/main/AI共有ブリーフィング_最新.md';
// DriveのGoogle Docは「補助コピー」。GAS経由の転送は best-effort で、
// 失敗してもビルドは落とさない（旧版/未デプロイでも偽green/赤を作らない）。
const gasUrl = process.env.GAS_WEBAPP_URL;
const gasToken = process.env.GAS_SHARED_TOKEN;
const BRIEFING_DOC_ID = '1nItOD505h2CHEMd_xjUtPaupAF0QNHR-u1IMhf0cGf0';
if (gasUrl && gasToken) {
  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: gasToken, action: 'writeToDoc', docId: BRIEFING_DOC_ID, content: briefing }),
    });
    const data = await res.json().catch(() => ({ ok: false, error: 'non-JSON応答（GAS旧版/デプロイ不正の可能性）' }));
    if (data.ok) console.log('✅ DriveのAI共有ブリーフィング_最新 を更新しました（補助コピー）。');
    else console.warn('⚠️ Drive補助コピー更新スキップ:', data.error, '/ 正本はGitHub:', BRIEFING_GH_URL);
  } catch (e) {
    console.warn('⚠️ Drive補助コピー更新スキップ（GAS到達不可）:', String(e.message || e), '/ 正本はGitHub:', BRIEFING_GH_URL);
  }
} else {
  console.log('ℹ️ GAS未設定 — Drive補助コピーはスキップ。正本はGitHub:', BRIEFING_GH_URL);
}
