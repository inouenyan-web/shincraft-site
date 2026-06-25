// 台帳（投稿管理シート）の承認済み行のうち、出店・イベント告知を公式LINEへ配信する。
// ★Metaトークン非依存★ — Instagram Graph API を一切使わない。
//
// 背景（2026-06-16 全員会議）:
//   従来のIG→LINEミラー（mirror_instagram_to_line.mjs）は Instagram Graph API で
//   投稿を読むため Metaトークンが必須で、トークン取得が止まると配信も止まっていた。
//   告知本文は台帳（Sheets）に承認済みで存在するので、Instexの投稿成否と無関係に
//   台帳起点でLINEへブロードキャストできる。これでLINE配信は Meta から独立する。
//
// 仕組み:
//   1. 台帳から「承認」以降（承認/投稿予約済み/投稿済み）の行を取得
//   2. Instagram本文（無ければX本文）に出店・イベント告知キーワードを含む行だけ抽出
//   3. まだLINEへ流していない行（管理IDがstateに無い）を新規とみなす
//   4. ハッシュタグを除去してLINEへブロードキャスト
//   5. 配信済みの管理IDをstateに記録（重複送信を防止）
//
// 必要env: GAS_WEBAPP_URL, GAS_SHARED_TOKEN, LINE_CHANNEL_ACCESS_TOKEN
//   （META_ACCESS_TOKEN は不要）
//
// 使い方:
//   node scripts/mirror_ledger_to_line.mjs            # 新規告知をLINEへ
//   node scripts/mirror_ledger_to_line.mjs --dry-run  # 送信せず対象だけ表示
//   node scripts/mirror_ledger_to_line.mjs --seed     # 既存の承認行を「配信済み」として記録のみ（初回の誤爆防止）
//
// ⚠️ 二重配信について: IG起点ミラー（mirror_instagram_to_line.mjs）と本スクリプトを
//   同時に本番稼働させると、同じ告知がIG投稿経由と台帳経由で2回送られうる。
//   どちらか一方を本番にすること。当面はMeta非依存の本スクリプトを主とし、
//   IG起点は seed/dry-run に留める運用を推奨。

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listRows } from './lib/ledger.mjs';
import { broadcastToLine, toLineText } from './lib/line_client.mjs';
import { isEventPost } from './lib/event_keywords.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = resolve(__dirname, '../data/line_ledger_mirrored.json');

const DRY_RUN = process.argv.includes('--dry-run');
const SEED = process.argv.includes('--seed');

// 人間の承認ゲートを通過した行だけを配信対象にする。
const APPROVED_STATUSES = new Set(['承認', '投稿予約済み', '投稿済み']);

async function loadState() {
  try {
    const raw = await readFile(STATE_PATH, 'utf8');
    const json = JSON.parse(raw);
    return Array.isArray(json.mirroredIds) ? json : { mirroredIds: [] };
  } catch {
    return { mirroredIds: [] };
  }
}

async function saveState(state) {
  await mkdir(dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

// 配信対象の本文を決める（Instagram本文優先、無ければX本文）。
function pickBody(row) {
  return String(row['Instagram本文'] || row['X本文'] || '').trim();
}

async function main() {
  const state = await loadState();
  const seen = new Set(state.mirroredIds);

  const rows = await listRows();
  const approved = rows.filter((r) => APPROVED_STATUSES.has(String(r['ステータス'] || '').trim()));
  console.log(`承認以降の行 ${approved.length}件。配信済み記録 ${seen.size}件。`);

  // 告知キーワード該当かつ管理IDを持つ行
  const eventRows = approved.filter((r) => r['管理ID'] && isEventPost(pickBody(r)));

  // --seed: 既存の承認イベント行を全部「配信済み」として記録するだけ（過去分の誤爆防止）
  if (SEED) {
    for (const r of eventRows) seen.add(String(r['管理ID']));
    await saveState({ mirroredIds: [...seen], updatedAt: new Date().toISOString() });
    console.log(`✅ 既存${eventRows.length}件を配信済みとして記録しました（送信はしていません）。`);
    return;
  }

  const targets = eventRows.filter((r) => !seen.has(String(r['管理ID'])));

  if (targets.length === 0) {
    console.log('LINEへ流す新規の出店・イベント告知はありません。');
    return;
  }

  let sent = 0;
  for (const row of targets) {
    const id = String(row['管理ID']);
    const lineText = toLineText(pickBody(row), String(row['ハッシュタグ'] || ''));
    if (!lineText) {
      console.log(`\n▶ 管理ID ${id}: 本文が空のためスキップ`);
      seen.add(id); // 空行は再評価しない
      continue;
    }
    const preview = lineText.slice(0, 80) + (lineText.length > 80 ? '…' : '');
    console.log(`\n▶ 管理ID ${id}`);
    console.log(`  LINE本文: ${preview}`);

    if (DRY_RUN) {
      console.log('  （dry-run：送信せず）');
      continue;
    }

    await broadcastToLine(lineText);
    seen.add(id);
    sent++;
    console.log('  ✅ LINEへ配信しました');
  }

  if (!DRY_RUN && sent > 0) {
    await saveState({ mirroredIds: [...seen], updatedAt: new Date().toISOString() });
    console.log(`\n配信済み記録を更新しました（今回 ${sent}件送信）。`);
  }
}

main().catch((err) => {
  console.error('台帳→LINEミラー失敗:', err.message);
  process.exit(1);
});
