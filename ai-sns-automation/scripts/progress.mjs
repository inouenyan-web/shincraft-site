// 秘書1 タスク振り分け台帳ユーティリティ
// ~/claude_sync/progress.json をローカル正本として読み書きする。
// GAS「振り分け台帳」シートへの同期は syncToGas() で行う（GAS再デプロイ後に有効）。
//
// 使い方:
//   import { addTask, updateTask, listTasks } from './progress.mjs';
//
// CLI:
//   node scripts/progress.mjs list
//   node scripts/progress.mjs add --lane 知財 --name "商標先行調査" --status 受付
//   node scripts/progress.mjs update --id TASK-xxx --status 完了 --summary "完了メモ"

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// 正本はリポジトリ内（git管理＝GitHubで永続化）。
// ~/claude_sync/progress.json は本ファイルへのシンボリックリンク（指示書の参照パスを満たす）。
const DB_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'progress.json');
const LANES = ['知財', '法務・紛争', '労務・行政', '営業・マーケ', '制作', '発信', '連携・同期'];
const STATUSES = ['受付', '委譲', 'レビュー', '完了', 'キャンセル'];

function load() {
  if (!existsSync(DB_PATH)) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    return { tasks: [] };
  }
  return JSON.parse(readFileSync(DB_PATH, 'utf8'));
}

function save(db) {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function newId() {
  return 'TASK-' + Date.now().toString(36).toUpperCase();
}

export function addTask({ lane, name, brief = '', approval = '不要', status = '受付' }) {
  const db = load();
  const task = {
    task_id: newId(),
    日時: new Date().toISOString(),
    レーン: lane,
    ステータス: status,
    タスク名: name,
    ブリーフ: brief,
    結果サマリ: '',
    本人承認: approval,
    更新日時: new Date().toISOString(),
  };
  db.tasks.push(task);
  save(db);
  return task;
}

export function updateTask(taskId, updates) {
  const db = load();
  const t = db.tasks.find(x => x.task_id === taskId);
  if (!t) throw new Error('task not found: ' + taskId);
  Object.assign(t, updates, { 更新日時: new Date().toISOString() });
  save(db);
  return t;
}

export function listTasks({ lane, status } = {}) {
  const db = load();
  return db.tasks.filter(t =>
    (!lane || t.レーン === lane) &&
    (!status || t.ステータス === status)
  );
}

// GAS正本への同期（GAS再デプロイ後に有効）
export async function syncToGas() {
  const { callGas } = await import('./lib/ledger.mjs');
  const db = load();
  for (const t of db.tasks) {
    try {
      await callGas({ action: 'append', sheet: '振り分け台帳', values: t });
    } catch (e) {
      console.error('GAS sync skip:', t.task_id, e.message);
    }
  }
}

// CLI
if (process.argv[1].endsWith('progress.mjs')) {
  const cmd = process.argv[2];
  const args = {};
  const argv = process.argv.slice(3);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    }
  }

  if (cmd === 'list') {
    const tasks = listTasks({ lane: args.lane, status: args.status });
    if (!tasks.length) { console.log('タスクなし'); process.exit(0); }
    tasks.forEach(t => console.log(`[${t.task_id}] ${t.ステータス} | ${t.レーン} | ${t.タスク名}`));
  } else if (cmd === 'add') {
    const t = addTask({ lane: args.lane, name: args.name, brief: args.brief, approval: args.approval, status: args.status });
    console.log(JSON.stringify(t, null, 2));
  } else if (cmd === 'update') {
    const { id, ...rest } = args;
    const t = updateTask(id, rest);
    console.log(JSON.stringify(t, null, 2));
  } else {
    console.log('Usage: node scripts/progress.mjs list|add|update [--options]');
  }
}
