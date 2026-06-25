// LINE Messaging API クライアント
// 必要env: LINE_CHANNEL_ACCESS_TOKEN
// 任意env: LINE_OWNER_USER_ID（設定するとbroadcastの代わりにオーナーへのpushになる）

const LINE_API_BASE = 'https://api.line.me/v2/bot/message';

async function linePost(path, body, token) {
  const res = await fetch(LINE_API_BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    throw new Error(`LINE APIエラー HTTP ${res.status}: ${detail}`);
  }
  return { ok: true };
}

/**
 * LINE公式アカウントの全フォロワーにテキストメッセージをブロードキャストする。
 * LINE_CHANNEL_ACCESS_TOKEN が未設定の場合は null を返す。
 */
export async function broadcastToLine(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;
  return linePost('/broadcast', {
    messages: [{ type: 'text', text: String(text).slice(0, 5000) }],
  }, token);
}

/**
 * 特定のLINEユーザーにテキストメッセージをpushする。
 * LINE_CHANNEL_ACCESS_TOKEN が未設定の場合は null を返す。
 * @param {string} userId  対象ユーザーのLINE userId
 * @param {string} text    送信するテキスト（最大5000文字）
 */
export async function pushTextToUser(userId, text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;
  return linePost('/push', {
    to: userId,
    messages: [{ type: 'text', text: String(text).slice(0, 5000) }],
  }, token);
}

/**
 * LINE_OWNER_USER_ID があればpush、なければbroadcastでテキストを送る。
 * LINE_CHANNEL_ACCESS_TOKEN が未設定の場合は null を返す。
 */
export async function notifyOwner(text) {
  const ownerUserId = process.env.LINE_OWNER_USER_ID;
  if (ownerUserId) {
    return pushTextToUser(ownerUserId, text);
  }
  return broadcastToLine(text);
}

/**
 * Instagram本文をLINE向けに整形する（ハッシュタグ除去）。
 */
export function toLineText(instagramText, hashtags = '') {
  let text = String(instagramText || '');
  if (hashtags) {
    text = text.replace(hashtags.trim(), '').trim();
  }
  text = text.replace(/#[\w぀-鿿豈-﫿]+/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return text;
}
