// セッション開始時に「今日のブリーフィング」を生成する。
// 出力: { systemMessage: string }（Claude Code hook形式）
//
// 含む情報:
//   1. 今日の日付（JST）
//   2. 🔥 最優先タスク（運用ボード.md）
//   3. 📊 台帳状況（GAS API）
//   4. 📱 Instagramチェック結果（daily_report.md / GitHub Actions が毎朝保存）

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dir, '..', '..');

const jstDate = () =>
  new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

function getPriorityTasks() {
  const path = join(REPO_ROOT, '運用ボード.md');
  if (!existsSync(path)) return '';
  const board = readFileSync(path, 'utf8');
  const m = board.match(/## 🔥 今の最優先.*?\n([\s\S]*?)\n---/);
  if (!m) return '';
  return m[1]
    .split('\n')
    .filter(line => /^\d+\./.test(line.trim()))
    .map(line => line.trim().replace(/\*\*/g, ''))
    .slice(0, 5)
    .join('\n');
}

function getDailyReport() {
  const path = join(REPO_ROOT, 'daily_report.md');
  if (!existsSync(path)) return '';
  const content = readFileSync(path, 'utf8').trim();
  // 長い場合は最初の20行に制限
  return content.split('\n').slice(0, 20).join('\n');
}

async function getLedgerStatus() {
  if (!process.env.GAS_WEBAPP_URL || !process.env.GAS_SHARED_TOKEN) return '';
  try {
    const { listRows } = await import('./lib/ledger.mjs');
    const rows = await listRows();
    const pending = rows.filter(r => ['未確認', '修正'].includes(r['ステータス'] ?? '')).length;
    const approved = rows.filter(r => r['ステータス'] === '承認').length;
    const total = rows.length;
    return `総数 ${total}件 | 未確認/修正 ${pending}件 | 承認待ち投稿 ${approved}件`;
  } catch {
    return '';
  }
}

const [ledger] = await Promise.all([getLedgerStatus()]);
const priority = getPriorityTasks();
const report = getDailyReport();

const parts = [`📅 ${jstDate()} のブリーフィング`];

if (priority) {
  parts.push('', '🔥 最優先タスク:', priority);
}
if (ledger) {
  parts.push('', `📊 台帳: ${ledger}`);
}
if (report) {
  parts.push('', '📱 最新Instagramチェック:', report);
}

parts.push('', '▶ 作業: /sns で投稿パイプライン、/note-x でnote→X、またはそのまま話しかけてください。');

console.log(JSON.stringify({ systemMessage: parts.join('\n') }));
