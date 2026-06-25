// Instagram DM受信箱の監視と受注管理シートへの自動記録
// GitHub Actions から1日2回（朝9時・夜9時 JST）呼び出す。
//
// 動作:
//   1. Instagram Conversations API で直近24h の受信DMを取得
//   2. 購入意向あり（確度:高・中）のメッセージを受注管理シートへ直接追記
//      ※ fingerprint（message.id）を IG_DM_log シートで重複防止
//   3. 全DMの要約を LINE で報告
//      （LINE_OWNER_USER_ID があれば井上さんへのpush、なければ全員ブロードキャスト）
//
// 必要scope（META_ACCESS_TOKEN に追加が必要）:
//   instagram_manage_messages または instagram_business_manage_messages
//
// 使い方:
//   node scripts/check_dm.mjs [--dry-run]
//
// 必要env: IG_USER_ID, META_ACCESS_TOKEN, GAS_WEBAPP_URL, GAS_SHARED_TOKEN
// 任意env: LINE_CHANNEL_ACCESS_TOKEN, LINE_OWNER_USER_ID

import { callGas } from './lib/ledger.mjs';
import { notifyOwner } from './lib/line_client.mjs';
import { requireEnv } from './lib/env.mjs';

const DRY_RUN = process.argv.includes('--dry-run');

const GRAPH_VERSION = 'v21.0';
const GRAPH_API = `https://graph.facebook.com/${GRAPH_VERSION}`;

// 確度判定キーワード
const HIGH_KWORDS = ['注文', 'ご注文', 'ご発注', '購入', 'オーダー', '予約', '申し込み', 'これください', 'ください'];
const MED_KWORDS  = ['欲しい', '買いたい', 'いくら', '価格', '値段', '在庫', '名入れ', 'カスタム', '作れ', '作れます'];
const PROD_KWORDS = ['キーホルダー', 'ネームタグ', '桶', 'ピアス', 'イヤリング', 'ネックレス', 'タグ', '看板', 'チャーム'];

function detectConfidence(text) {
  const t = String(text || '');
  if (HIGH_KWORDS.some(k => t.includes(k))) return '高';
  if (MED_KWORDS.some(k => t.includes(k)) || PROD_KWORDS.some(k => t.includes(k))) return '中';
  return '低';
}

async function graphGet(accessToken, path, params = {}) {
  const url = new URL(GRAPH_API + path);
  url.searchParams.set('access_token', accessToken);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { method: 'GET' });
  const data = await res.json();
  if (data.error) {
    const e = data.error;
    throw new Error(`Graph APIエラー: ${e.message}（type=${e.type}, code=${e.code}）`);
  }
  return data;
}

// IG_DM_log シートで重複チェック用の fingerprint を管理
async function getLoggedFingerprints() {
  try {
    await callGas({ action: 'ensureSheet', sheet: 'IG_DM_log', headers: ['fingerprint', 'logged_at'] });
    const res = await callGas({ action: 'list', sheet: 'IG_DM_log' });
    return new Set((res.rows || []).map(r => r['fingerprint'] || '').filter(Boolean));
  } catch {
    return new Set();
  }
}

async function logFingerprint(fingerprint, loggedAt) {
  return callGas({ action: 'append', sheet: 'IG_DM_log', values: { fingerprint, logged_at: loggedAt } });
}

// 受注管理シートへ直接追記（Code.gs の appendToJuchuSheet アクション）
async function addToJuchuSheet(entry) {
  return callGas({ action: 'appendToJuchuSheet', values: entry });
}

function printFallback() {
  console.log('⚠️ IG_USER_ID / META_ACCESS_TOKEN が未設定、または instagram_manage_messages スコープが不足しています。');
  console.log('   DM自動監視を有効にするには SETUP_SECRETS.md「8. Instagram Graph API」を参照し、');
  console.log('   システムユーザートークン（無期限・B1）に instagram_manage_messages スコープを追加してください。');
  console.log('');
  console.log('--- Chrome版Claude手動確認プロンプト（コピー用）---');
  console.log('@shincraft2023 のInstagram DM受信箱を確認し、以下を教えてください：');
  console.log('  1. 直近24時間の未読DM数と送信者名');
  console.log('  2. 商品購入・注文・お問い合わせの内容（要約）');
  console.log('  3. 返信が必要そうなもの');
  console.log('--- ここまで ---');
}

async function main() {
  let env;
  try {
    env = requireEnv(['IG_USER_ID', 'META_ACCESS_TOKEN']);
  } catch {
    printFallback();
    process.exit(0);
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  console.log('📬 Instagram DM受信箱を取得中...');

  // 会話一覧を取得（最新50件）
  let conversations;
  try {
    const data = await graphGet(env.META_ACCESS_TOKEN, `/${env.IG_USER_ID}/conversations`, {
      platform: 'instagram',
      fields: 'id,updated_time',
      limit: '50',
    });
    conversations = data.data || [];
  } catch (e) {
    if (/code=190|code=10|Permission|OAuthException|scope/.test(String(e.message))) {
      console.error(`⚠️ DM APIアクセス失敗: ${e.message}`);
      console.error('   META_ACCESS_TOKEN に instagram_manage_messages スコープが必要です（B1タスク）。');
      printFallback();
      process.exit(0);
    }
    throw e;
  }

  // 24h以内に更新された会話のみ絞り込み
  const recentConvs = conversations.filter(c => c.updated_time && new Date(c.updated_time) >= since);
  console.log(`直近24h更新の会話: ${recentConvs.length}/${conversations.length}件`);

  const loggedFp = await getLoggedFingerprints();
  const allEntries = [];   // 全DM（報告用）
  const orderEntries = []; // 確度 高・中（受注管理シートへ）

  for (const conv of recentConvs) {
    let messages;
    try {
      const data = await graphGet(env.META_ACCESS_TOKEN, `/${conv.id}/messages`, {
        fields: 'id,text,from,timestamp',
        limit: '20',
      });
      messages = data.data || [];
    } catch (e) {
      console.error(`会話 ${conv.id} のメッセージ取得失敗: ${e.message}`);
      continue;
    }

    // 24h以内・自分以外が送ったメッセージ
    const incoming = messages.filter(m => {
      if (!m.timestamp) return false;
      if (new Date(m.timestamp) < since) return false;
      return String(m.from?.id) !== String(env.IG_USER_ID);
    });

    for (const msg of incoming) {
      const fingerprint = msg.id;
      if (loggedFp.has(fingerprint)) continue;
      loggedFp.add(fingerprint);

      const senderName = msg.from?.username || msg.from?.name || String(msg.from?.id || '不明');
      const jstTime = new Date(msg.timestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      const msgText = String(msg.text || '（テキストなし）').slice(0, 500);
      const confidence = detectConfidence(msgText);

      const entry = { fingerprint, jstTime, senderName, msgText, confidence };
      allEntries.push(entry);
      if (confidence === '高' || confidence === '中') orderEntries.push(entry);
    }
  }

  if (allEntries.length === 0) {
    console.log('✅ 直近24hの新着DM: 0件');
    return;
  }

  console.log(`\n📋 新着DM: ${allEntries.length}件（うち受注見込み ${orderEntries.length}件）`);
  for (const e of allEntries) {
    console.log(`  [${e.confidence}] ${e.jstTime} @${e.senderName}: ${e.msgText.slice(0, 60)}`);
  }

  if (DRY_RUN) {
    console.log('\n（--dry-run モード：シートへの書き込みをスキップ）');
    return;
  }

  // fingerprint をログに記録
  for (const entry of allEntries) {
    await logFingerprint(entry.fingerprint, entry.jstTime);
  }

  // 確度 高・中 → 受注管理シートへ直接追記
  for (const entry of orderEntries) {
    await addToJuchuSheet({
      タスク: 'Instagram受注',
      発注日: entry.jstTime,
      顧客名: `@${entry.senderName}`,
      商品名: '',
      詳細: entry.msgText.slice(0, 200),
      備考: `Instagram DM（確度${entry.confidence}）`,
    });
  }
  if (orderEntries.length > 0) {
    console.log(`\n✅ ${orderEntries.length}件を受注管理シートに追記しました。`);
  }

  // LINE報告
  const high = allEntries.filter(e => e.confidence === '高');
  const med  = allEntries.filter(e => e.confidence === '中');
  const low  = allEntries.filter(e => e.confidence === '低');

  const reportLines = [
    `📬 ShinCRAFT Instagram DM新着（直近24h）: ${allEntries.length}件`,
    '',
    ...(high.length > 0 ? [
      `🔴 購入意向あり（高）: ${high.length}件`,
      ...high.map(e => `  ・@${e.senderName}: ${e.msgText.slice(0, 60)}`),
    ] : []),
    ...(med.length > 0 ? [
      `🟡 問合せあり（中）: ${med.length}件`,
      ...med.map(e => `  ・@${e.senderName}: ${e.msgText.slice(0, 40)}`),
    ] : []),
    ...(low.length > 0 ? [`⚪ その他: ${low.length}件`] : []),
    ...(orderEntries.length > 0
      ? [`\n✅ 受注管理シートに${orderEntries.length}件追記しました。`]
      : []),
  ].join('\n');

  const lineResult = await notifyOwner(reportLines);
  if (lineResult) {
    console.log('✅ LINE報告を送信しました。');
  } else {
    console.log('（LINE_CHANNEL_ACCESS_TOKEN 未設定のためLINE通知をスキップ）');
  }
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => {
    console.error('致命的エラー:', String(e.message || e));
    process.exit(1);
  });
}
