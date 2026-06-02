// 承認済み行をBuffer経由でInstagramに投稿する。
// 使い方:
//   node scripts/post_to_buffer.mjs --dry-run   # 内容確認のみ
//   node scripts/post_to_buffer.mjs              # 実投稿

import { listRowsByStatus, updateRowByManagementId } from './lib/ledger.mjs';
import { postToBuffer, toDirectImageUrl } from './lib/buffer_client.mjs';

const DRY_RUN = process.argv.includes('--dry-run');

const rows = await listRowsByStatus('承認');
if (rows.length === 0) {
  console.log('承認済みの行がありません。');
  process.exit(0);
}

// Instagram本文が入っている行だけを対象にする
const targets = rows.filter(r => String(r['Instagram本文'] || '').trim());
if (targets.length === 0) {
  console.log('Instagram本文が設定された承認済み行がありません。');
  process.exit(0);
}

console.log(`対象: ${targets.length}件${DRY_RUN ? '（dry-run）' : ''}\n`);

let successCount = 0;
let errorCount = 0;

for (const row of targets) {
  const id = row['管理ID'];
  const body = String(row['Instagram本文'] || '').trim();
  const hashtags = String(row['ハッシュタグ'] || '').trim();
  const rawImageUrl = String(row['生成画像URL'] || '').trim();
  const imageUrl = toDirectImageUrl(rawImageUrl) || null;
  const text = hashtags ? `${body}\n\n${hashtags}` : body;

  if (DRY_RUN) {
    console.log(`[DRY-RUN] ${id}`);
    console.log(`  本文 : ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`);
    console.log(`  画像 : ${imageUrl ?? '（なし）'}`);
    console.log('');
    continue;
  }

  try {
    const result = await postToBuffer({ text, imageUrl });
    console.log(`[OK] ${id} → BufferID: ${result.bufferId}`);
    await updateRowByManagementId(id, {
      'Buffer投稿ID': result.bufferId,
      'ステータス': '投稿予約済み',
    });
    successCount++;
  } catch (err) {
    console.error(`[ERROR] ${id}: ${err.message}`);
    await updateRowByManagementId(id, { 'ステータス': 'エラー' }).catch(() => {});
    errorCount++;
  }
}

if (!DRY_RUN) {
  console.log(`\n完了: 成功 ${successCount}件、エラー ${errorCount}件`);
}
