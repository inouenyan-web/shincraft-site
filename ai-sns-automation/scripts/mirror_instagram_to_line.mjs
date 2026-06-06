// Instagramの新着投稿を検出し、出店・イベント告知だけを公式LINEへ自動ブロードキャストする。
// GitHub Actions で定期実行する想定（.github/workflows/instagram-to-line.yml）。
//
// 仕組み:
//   1. Instagram Graph API で最新メディアを取得
//   2. 出店・イベント告知キーワードを含む投稿だけ抽出
//   3. まだLINEへ流していない投稿（state.jsonに未記録）を新規とみなす
//   4. 本文をLINE向けに整形（ハッシュタグ除去）してブロードキャスト
//   5. 配信済みIDをstateに記録（重複送信を防止）
//
// 必要env: IG_USER_ID, META_ACCESS_TOKEN, LINE_CHANNEL_ACCESS_TOKEN
//
// 使い方:
//   node scripts/mirror_instagram_to_line.mjs            # 実行（新規告知をLINEへ）
//   node scripts/mirror_instagram_to_line.mjs --dry-run  # 送信せず対象だけ表示
//   node scripts/mirror_instagram_to_line.mjs --seed     # 既存投稿を「配信済み」として記録だけする（初回の誤爆防止）

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRecentMedia } from './lib/instagram_client.mjs';
import { broadcastToLine, toLineText } from './lib/line_client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = resolve(__dirname, '../data/line_mirrored.json');

const DRY_RUN = process.argv.includes('--dry-run');
const SEED = process.argv.includes('--seed');
const LIMIT = 10;

// 出店・イベント告知とみなすキーワード（本文に含まれていればLINEへ流す）。
// 日常の軽い投稿を全友だちに一斉送信しないための絞り込み。
const EVENT_KEYWORDS = [
  '出店', '出展', 'イベント', 'マルシェ', 'マーケット', 'フェス', 'フェア',
  'ワークショップ', '体験会', '販売会', '出店予定', '出店情報',
  'POPUP', 'POP UP', 'ポップアップ', '催事', 'にて開催', '開催します', '出店します',
];

function isEventPost(caption) {
  const text = String(caption || '');
  return EVENT_KEYWORDS.some((kw) => text.includes(kw));
}

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

async function main() {
  const state = await loadState();
  const seen = new Set(state.mirroredIds);

  const media = await getRecentMedia(LIMIT);
  console.log(`最新${media.length}件を取得。配信済み記録 ${seen.size}件。`);

  // --seed: 既存投稿を全部「配信済み」として記録するだけ（過去分の誤爆を防ぐ初回処理）
  if (SEED) {
    for (const m of media) seen.add(m.id);
    await saveState({ mirroredIds: [...seen], updatedAt: new Date().toISOString() });
    console.log(`✅ 既存${media.length}件を配信済みとして記録しました（送信はしていません）。`);
    return;
  }

  // 新規 × 告知キーワード該当のものだけ対象に
  const targets = media.filter((m) => !seen.has(m.id) && isEventPost(m.caption));

  if (targets.length === 0) {
    console.log('LINEへ流す新規の出店・イベント告知はありません。');
    return;
  }

  // 古い順に送る（投稿された順序を保つ）
  targets.reverse();

  let sent = 0;
  for (const m of targets) {
    const lineText = toLineText(m.caption);
    const preview = lineText.slice(0, 80) + (lineText.length > 80 ? '…' : '');
    console.log(`\n▶ ${m.permalink}`);
    console.log(`  LINE本文: ${preview}`);

    if (DRY_RUN) {
      console.log('  （dry-run：送信せず）');
      continue;
    }

    await broadcastToLine(lineText);
    seen.add(m.id);
    sent++;
    console.log('  ✅ LINEへ配信しました');
  }

  if (!DRY_RUN && sent > 0) {
    await saveState({ mirroredIds: [...seen], updatedAt: new Date().toISOString() });
    console.log(`\n配信済み記録を更新しました（今回 ${sent}件送信）。`);
  }
}

main().catch((err) => {
  console.error('IG→LINEミラー失敗:', err.message);
  process.exit(1);
});
