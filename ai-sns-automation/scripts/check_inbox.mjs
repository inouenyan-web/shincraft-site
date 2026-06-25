// 統合受信箱チェッカー
// Instagram DM・Chatwork・Gmail を一括監視し、
// 受注案件/交渉中/その他 に分類して受注管理シートへ追記・報告する。
// GitHub Actions から1日2回（朝9時・夜9時 JST）実行。
//
// 必要env:
//   GAS_WEBAPP_URL, GAS_SHARED_TOKEN            (受注管理シートへの書き込み・重複防止)
//   IG_USER_ID, META_ACCESS_TOKEN               (Instagram DM - 未設定ならスキップ)
//   CHATWORK_API_TOKEN                          (Chatwork - 未設定ならスキップ)
//   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET,
//   GMAIL_REFRESH_TOKEN                         (Gmail - 未設定ならスキップ)
//
// 使い方:
//   node scripts/check_inbox.mjs [--dry-run]

import { callGas } from './lib/ledger.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const SINCE_MS = Date.now() - 24 * 60 * 60 * 1000;

// 確度判定キーワード
const HIGH_KWORDS = ['注文', 'ご注文', 'ご発注', '購入', 'オーダー', '予約', '申し込み', 'これください', 'ください', 'お願いします', '発注'];
const MED_KWORDS  = ['欲しい', '買いたい', 'いくら', '価格', '値段', '在庫', '名入れ', 'カスタム', '見積', '相談', '検討', '提案', 'できます', 'できますか'];
const PROD_KWORDS = ['キーホルダー', 'ネームタグ', '桶', 'ピアス', 'イヤリング', 'ネックレス', 'タグ', '看板', 'チャーム', 'アクセサリ', 'ステンレス', '多用途スタンド'];

function detectConfidence(text) {
  const t = String(text || '');
  if (HIGH_KWORDS.some(k => t.includes(k))) return '高';
  if (MED_KWORDS.some(k => t.includes(k)) || PROD_KWORDS.some(k => t.includes(k))) return '中';
  return '低';
}

function jstStr(tsMs) {
  return new Date(tsMs).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

// ─── 重複防止（inbox_log シート） ───────────────────────────────────────

async function getLoggedFingerprints() {
  try {
    await callGas({ action: 'ensureSheet', sheet: 'inbox_log', headers: ['fingerprint', 'channel', 'logged_at'] });
    const res = await callGas({ action: 'list', sheet: 'inbox_log' });
    return new Set((res.rows || []).map(r => r['fingerprint'] || '').filter(Boolean));
  } catch {
    return new Set();
  }
}

async function logFingerprint(fingerprint, channel, loggedAt) {
  try {
    await callGas({ action: 'append', sheet: 'inbox_log', values: { fingerprint, channel, logged_at: loggedAt } });
  } catch {}
}

async function addToJuchuSheet(entry) {
  return callGas({ action: 'appendToJuchuSheet', values: entry });
}

// ─── Instagram DM ────────────────────────────────────────────────────────

async function checkInstagramDm() {
  const igUserId = process.env.IG_USER_ID;
  const metaToken = process.env.META_ACCESS_TOKEN;
  if (!igUserId || !metaToken) return { status: 'skip', reason: 'IG_USER_ID / META_ACCESS_TOKEN 未設定' };

  const GRAPH_API = 'https://graph.facebook.com/v21.0';
  async function graphGet(path, params = {}) {
    const url = new URL(GRAPH_API + path);
    url.searchParams.set('access_token', metaToken);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(`Graph APIエラー: ${data.error.message}（code=${data.error.code}）`);
    return data;
  }

  let conversations;
  try {
    const data = await graphGet(`/${igUserId}/conversations`, {
      platform: 'instagram',
      fields: 'id,updated_time',
      limit: '50',
    });
    conversations = data.data || [];
  } catch (e) {
    if (/code=190|code=10|Permission|OAuthException|scope/.test(String(e.message))) {
      return { status: 'skip', reason: `instagram_manage_messages スコープ不足: ${e.message}` };
    }
    throw e;
  }

  const recent = conversations.filter(c => c.updated_time && new Date(c.updated_time).getTime() >= SINCE_MS);
  const results = [];
  for (const conv of recent) {
    let msgs;
    try {
      const d = await graphGet(`/${conv.id}/messages`, { fields: 'id,text,from,timestamp', limit: '20' });
      msgs = d.data || [];
    } catch { continue; }
    for (const m of msgs) {
      if (!m.timestamp || new Date(m.timestamp).getTime() < SINCE_MS) continue;
      if (String(m.from?.id) === String(igUserId)) continue;
      results.push({
        channel: 'Instagram DM',
        id: String(m.id),
        senderName: m.from?.username || m.from?.name || '不明',
        body: String(m.text || '（テキストなし）').slice(0, 500),
        timestamp: new Date(m.timestamp).getTime(),
      });
    }
  }
  return { status: 'ok', messages: results };
}

// ─── Chatwork ────────────────────────────────────────────────────────────

async function checkChatwork() {
  const token = process.env.CHATWORK_API_TOKEN;
  if (!token) return { status: 'skip', reason: 'CHATWORK_API_TOKEN 未設定' };

  async function cwGet(path, params = {}) {
    const url = new URL('https://api.chatwork.com/v2' + path);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    const res = await fetch(url, { headers: { 'x-chatworktoken': token } });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Chatwork HTTP ${res.status}: ${detail}`);
    }
    return res.json();
  }

  let rooms;
  try {
    rooms = await cwGet('/rooms');
  } catch (e) {
    return { status: 'error', reason: e.message };
  }

  const sinceUnix = Math.floor(SINCE_MS / 1000);
  const results = [];

  for (const room of (rooms || [])) {
    let msgs;
    try {
      msgs = await cwGet(`/rooms/${room.room_id}/messages`, { force: 1 });
    } catch { continue; }
    for (const m of (msgs || [])) {
      if ((m.send_time || 0) < sinceUnix) continue;
      results.push({
        channel: `Chatwork[${room.name}]`,
        id: `cw_${room.room_id}_${m.message_id}`,
        senderName: m.account?.name || '不明',
        body: String(m.body || '').slice(0, 500),
        timestamp: (m.send_time || 0) * 1000,
      });
    }
  }
  return { status: 'ok', messages: results };
}

// ─── Gmail ───────────────────────────────────────────────────────────────

async function checkGmail() {
  const clientId     = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    return { status: 'skip', reason: 'GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN 未設定' };
  }

  let google;
  try {
    ({ google } = await import('googleapis'));
  } catch (e) {
    return { status: 'error', reason: `googleapis モジュール: ${e.message}` };
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
  auth.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: 'v1', auth });

  const afterUnix = Math.floor(SINCE_MS / 1000);
  let msgList;
  try {
    const r = await gmail.users.messages.list({
      userId: 'me',
      q: `in:inbox after:${afterUnix}`,
      maxResults: 50,
    });
    msgList = r.data.messages || [];
  } catch (e) {
    return { status: 'error', reason: `Gmail API: ${e.message}` };
  }

  const results = [];
  for (const msg of msgList) {
    let detail;
    try {
      const d = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From'],
      });
      detail = d.data;
    } catch { continue; }
    const headers = detail.payload?.headers || [];
    const getH = n => (headers.find(h => h.name === n) || {}).value || '';
    const ts = Number(detail.internalDate) || 0;
    if (ts < SINCE_MS) continue;
    results.push({
      channel: 'Gmail',
      id: String(msg.id),
      senderName: getH('From'),
      body: `件名: ${getH('Subject')}\n${String(detail.snippet || '').slice(0, 400)}`,
      timestamp: ts,
    });
  }
  return { status: 'ok', messages: results };
}

// ─── メイン ─────────────────────────────────────────────────────────────

async function main() {
  console.log(`📬 受信箱チェック開始（直近24h: ${jstStr(SINCE_MS)} 以降）\n`);

  const [igRes, cwRes, gmailRes] = await Promise.allSettled([
    checkInstagramDm(),
    checkChatwork(),
    checkGmail(),
  ]);

  const allMessages = [];
  const channelLines = [];

  function processResult(label, result) {
    if (result.status === 'rejected') {
      channelLines.push(`❌ ${label}: ${result.reason?.message || result.reason}`);
      return;
    }
    const r = result.value;
    if (r.status === 'skip') {
      channelLines.push(`⚪ ${label}: スキップ（${r.reason}）`);
    } else if (r.status === 'error') {
      channelLines.push(`❌ ${label}: ${r.reason}`);
    } else {
      const msgs = r.messages || [];
      channelLines.push(`✅ ${label}: ${msgs.length}件取得`);
      allMessages.push(...msgs);
    }
  }

  processResult('Instagram DM', igRes);
  processResult('Chatwork', cwRes);
  processResult('Gmail', gmailRes);

  console.log(channelLines.join('\n'));
  console.log('');

  if (allMessages.length === 0) {
    console.log('✅ 直近24hの新着: 0件');
    return;
  }

  // 重複チェック
  const loggedFp = await getLoggedFingerprints();
  const newMessages = allMessages.filter(m => !loggedFp.has(m.id));
  const skipped = allMessages.length - newMessages.length;

  // 分類
  const orderItems  = newMessages.filter(m => { const c = detectConfidence(m.body); m.confidence = c; return c === '高' || c === '中'; });
  const otherItems  = newMessages.filter(m => m.confidence === '低');

  console.log(`📊 新着: ${allMessages.length}件（うち初出 ${newMessages.length}件、重複スキップ ${skipped}件）`);
  console.log(`   → 受注案件・交渉中: ${orderItems.length}件 / その他: ${otherItems.length}件\n`);

  if (orderItems.length > 0) {
    console.log('## 🔴 受注案件・交渉中（確度 高/中）\n');
    for (const m of orderItems) {
      console.log(`### [${m.confidence}] ${m.channel} — ${m.senderName}（${jstStr(m.timestamp)}）`);
      console.log(m.body.slice(0, 200));
      console.log('');
    }
  }

  if (otherItems.length > 0) {
    console.log(`## ⚪ その他: ${otherItems.length}件\n`);
    for (const m of otherItems) {
      console.log(`- ${m.channel} [${m.senderName}]: ${m.body.slice(0, 80)}`);
    }
    console.log('');
  }

  if (DRY_RUN) {
    console.log('（--dry-run モード：シートへの書き込みをスキップ）');
    return;
  }

  // fingerprint を記録
  for (const m of newMessages) {
    await logFingerprint(m.id, m.channel, jstStr(m.timestamp));
  }

  // 受注案件・交渉中 → 受注管理シート
  let written = 0;
  for (const m of orderItems) {
    try {
      await addToJuchuSheet({
        タスク: m.channel.startsWith('Instagram') ? 'Instagram受注' : '受注',
        発注日: jstStr(m.timestamp),
        顧客名: m.senderName,
        商品名: '',
        詳細: m.body.slice(0, 200),
        備考: `${m.channel}（確度${m.confidence}）`,
      });
      written++;
    } catch (e) {
      console.error(`⚠️ 受注シート追記失敗 [${m.channel}]: ${e.message}`);
    }
  }

  if (written > 0) {
    console.log(`\n✅ ${written}件を受注管理シートに追記しました。`);
  }
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(e => {
    console.error('致命的エラー:', String(e.message || e));
    process.exit(1);
  });
}
