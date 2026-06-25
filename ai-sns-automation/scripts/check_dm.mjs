// Instagram DM受信箱の監視と受注見込みタスク化
// GitHub Actions から1日2回（朝9時・夜9時 JST）呼び出す。
//
// 動作:
//   1. Instagram Conversations API で直近24h の未読DMを取得
//   2. 送信者名・本文・確度（キーワード判定）を「受注見込み」シートへ追記
//      ※ message.id を fingerprint として重複防止
//   3. 新着があれば台帳のステップサマリーに出力
//      （LINE_CHANNEL_ACCESS_TOKEN があればLINE公式アカウントにもサマリーを送信）
//
// 必要scope（META_ACCESS_TOKEN に追加が必要）:
//   instagram_manage_messages または instagram_business_manage_messages
//   ※ 自社アカウントへのアクセスは Standard Access — App Review 審査不要
//
// 使い方:
//   node scripts/check_dm.mjs [--dry-run]
//
// 必要env: IG_USER_ID, META_ACCESS_TOKEN, GAS_WEBAPP_URL, GAS_SHARED_TOKEN
// 任意env: LINE_CHANNEL_ACCESS_TOKEN（設定するとLINEにもサマリーを送信）

import { callGas } from './lib/ledger.mjs';
import { broadcastToLine } from './lib/line_client.mjs';
import { requireEnv } from './lib/env.mjs';

const DRY_RUN = process.argv.includes('--dry-run');

const GRAPH_VERSION = 'v21.0';
const GRAPH_API = `https://graph.facebook.com/${GRAPH_VERSION}`;

// 確度判定キーワード
const HIGH_KWORDS = ['注文', 'ご注文', 'ご発注', '購入', 'オーダー', '予約', '申し込み', 'これください', 'ください'];
const MED_KWORDS  = ['欲しい', '買いたい', 'いくら', '価格', '値段', '在庫', '名入れ', 'カスタム', '作れ', '作れます'];
const PROD_KWORDS = ['キーホルダー', 'ネームタグ', '桶', 'ピアス', 'イヤリング', 'ネックレス', 'タグ', '看板', 'チャーム'];

// 「受注見込み」シートの列定義
const ORDER_SHEET_HEADERS = [
  '見込ID', '受信日時', '流入元', '元メッセージ',
  '顧客名', '商品名', '詳細', '数量', '単価', '売上金額',
  '納期見込', '確度', 'ステータス', '転記先レコード番号', 'fingerprint',
];

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

// 「受注見込み」シートを確保（なければ作成）
async function ensureOrderSheet() {
  return callGas({ action: 'ensureSheet', sheet: '受注見込み', headers: ORDER_SHEET_HEADERS });
}

// 既存 fingerprint 一覧を取得（重複チェック用）
async function getExistingFingerprints() {
  try {
    const res = await callGas({ action: 'list', sheet: '受注見込み' });
    return new Set((res.rows || []).map(r => r['fingerprint'] || '').filter(Boolean));
  } catch {
    return new Set();
  }
}

// 「受注見込み」シートへ1行追記
async function appendOrderRow(values) {
  return callGas({ action: 'append', sheet: '受注見込み', values });
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
    // スコープ不足や認証エラーの場合
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

  if (!DRY_RUN) {
    await ensureOrderSheet();
  }

  const existingFp = await getExistingFingerprints();
  const newEntries = [];

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
      // 自社アカウントが送信したメッセージは除外
      return String(m.from?.id) !== String(env.IG_USER_ID);
    });

    for (const msg of incoming) {
      const fingerprint = msg.id;
      if (existingFp.has(fingerprint)) continue;

      existingFp.add(fingerprint);
      const senderName = msg.from?.username || msg.from?.name || String(msg.from?.id || '不明');
      const jstTime = new Date(msg.timestamp).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      const msgText = String(msg.text || '（テキストなし）').slice(0, 500);

      newEntries.push({
        '見込ID':           fingerprint,
        '受信日時':          jstTime,
        '流入元':           'Instagram DM',
        '元メッセージ':      msgText,
        '顧客名':           senderName,
        '商品名':           '',
        '詳細':             '',
        '数量':             '',
        '単価':             '',
        '売上金額':          '',
        '納期見込':          '',
        '確度':             detectConfidence(msgText),
        'ステータス':        '未確認',
        '転記先レコード番号': '',
        'fingerprint':      fingerprint,
      });
    }
  }

  if (newEntries.length === 0) {
    console.log('✅ 直近24hの新着DM: 0件');
    return;
  }

  console.log(`\n📋 新着DM: ${newEntries.length}件`);
  for (const e of newEntries) {
    console.log(`  [${e['確度']}] ${e['受信日時']} @${e['顧客名']}: ${e['元メッセージ'].slice(0, 60)}`);
  }

  if (DRY_RUN) {
    console.log('\n（--dry-run モード：シートへの書き込みをスキップ）');
    return;
  }

  // 受注見込みシートへ追記
  for (const entry of newEntries) {
    await appendOrderRow(entry);
  }

  console.log(`\n✅ ${newEntries.length}件を「受注見込み」シートへ記録しました。`);
  console.log('   ShinCRAFT受注シート → 「受注見込み」タブでご確認ください。');

  // LINE通知（任意）
  const highConfidence = newEntries.filter(e => e['確度'] === '高');
  const lineText = [
    `📬 Instagram DM新着: ${newEntries.length}件`,
    highConfidence.length > 0 ? `  うち購入意向が高いもの: ${highConfidence.length}件` : '',
    '  → ShinCRAFT受注シート「受注見込み」タブを確認してください。',
    highConfidence.slice(0, 3).map(e => `  ・@${e['顧客名']}: ${e['元メッセージ'].slice(0, 40)}`).join('\n'),
  ].filter(Boolean).join('\n');

  const lineResult = await broadcastToLine(lineText);
  if (lineResult) {
    console.log('✅ LINE通知を送信しました。');
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
