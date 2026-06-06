// 承認済み行をBuffer経由でInstagramに投稿し、LINE_CHANNEL_ACCESS_TOKEN が設定されていれば
// LINE公式アカウントにも同時ブロードキャストする。
// 使い方:
//   node scripts/post_to_buffer.mjs --dry-run   # 内容確認のみ
//   node scripts/post_to_buffer.mjs              # 実投稿

import { listRowsByStatus, updateRowByManagementId } from './lib/ledger.mjs';
import { postToBuffer, toDirectImageUrl } from './lib/buffer_client.mjs';
import { broadcastToLine, toLineText } from './lib/line_client.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const LINE_ENABLED = !!process.env.LINE_CHANNEL_ACCESS_TOKEN;

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

console.log(`対象: ${targets.length}件${DRY_RUN ? '（dry-run）' : ''}${LINE_ENABLED ? ' / LINE連動あり' : ''}\n`);

let successCount = 0;
let errorCount = 0;

for (const row of targets) {
  const id = row['管理ID'];
  const body = String(row['Instagram本文'] || '').trim();
  const hashtags = String(row['ハッシュタグ'] || '').trim();
  const rawImageUrl = String(row['生成画像URL'] || '').trim();
  const imageUrl = toDirectImageUrl(rawImageUrl) || null;
  const text = hashtags ? `${body}\n\n${hashtags}` : body;
  const lineText = toLineText(body, hashtags);

  if (DRY_RUN) {
    console.log(`[DRY-RUN] ${id}`);
    console.log(`  Instagram : ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`);
    console.log(`  画像      : ${imageUrl ?? '（なし）'}`);
    if (LINE_ENABLED) {
      console.log(`  LINE      : ${lineText.slice(0, 80)}${lineText.length > 80 ? '…' : ''}`);
    } else {
      console.log(`  LINE      : （LINE_CHANNEL_ACCESS_TOKEN 未設定のためスキップ）`);
    }
    console.log('');
    continue;
  }

  try {
    // Instagram（Buffer経由）
    const result = await postToBuffer({ text, imageUrl });
    console.log(`[OK] Instagram ${id} → BufferID: ${result.bufferId}`);
    await updateRowByManagementId(id, {
      'Buffer投稿ID': result.bufferId,
      'ステータス': '投稿予約済み',
    });

    // LINE（任意・トークン設定時のみ）
    if (LINE_ENABLED) {
      try {
        await broadcastToLine(lineText);
        console.log(`[OK] LINE broadcast: ${id}`);
      } catch (lineErr) {
        console.error(`[WARN] LINE失敗（Instagram投稿は完了）: ${lineErr.message}`);
      }
    }

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
