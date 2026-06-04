// LINE Messaging API クライアント（公式アカウントのブロードキャスト用）
// 必要env: LINE_CHANNEL_ACCESS_TOKEN
// LINE_CHANNEL_ACCESS_TOKEN が未設定の場合は何もしない（スキップ）

const LINE_API = 'https://api.line.me/v2/bot/message/broadcast';

/**
 * LINE公式アカウントの全フォロワーにテキストメッセージをブロードキャストする。
 * LINE_CHANNEL_ACCESS_TOKEN が未設定の場合は何もせず null を返す。
 * @param {string} text  送信するテキスト（最大5000文字）
 * @returns {Promise<{ok: boolean}|null>}
 */
export async function broadcastToLine(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null; // 未設定なら黙ってスキップ

  const body = JSON.stringify({
    messages: [{ type: 'text', text: String(text).slice(0, 5000) }],
  });

  const res = await fetch(LINE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    throw new Error(`LINE APIエラー HTTP ${res.status}: ${detail}`);
  }

  return { ok: true };
}

/**
 * Instagram本文をLINE向けに整形する（ハッシュタグ除去・CTAを末尾に）。
 * @param {string} instagramText  Instagram本文（ハッシュタグ含む可）
 * @param {string} [hashtags]     別フィールドのハッシュタグ（あれば除去対象）
 * @returns {string}
 */
export function toLineText(instagramText, hashtags = '') {
  let text = String(instagramText || '');
  // ハッシュタグ行を除去
  if (hashtags) {
    text = text.replace(hashtags.trim(), '').trim();
  }
  // 行中の個別ハッシュタグも除去
  text = text.replace(/#[\w぀-鿿豈-﫿]+/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return text;
}
