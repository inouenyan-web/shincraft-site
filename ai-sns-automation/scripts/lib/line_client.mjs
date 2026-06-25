// LINE Messaging API クライアント
// 必要env: LINE_CHANNEL_ACCESS_TOKEN
// 任意env: LINE_OWNER_USER_ID（設定するとオーナーへのpush+Flex承認ボタン付きに昇格）

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
 * 特定のLINEユーザーにメッセージをpushする。
 * @param {string} userId    対象ユーザーのLINE userId
 * @param {Array}  messages  LINE Messageオブジェクト配列（最大5件）
 */
export async function pushMessageToUser(userId, messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;
  return linePost('/push', {
    to: userId,
    messages: messages.slice(0, 5),
  }, token);
}

/**
 * IG DM新着エントリをFlexカルーセル（承認/保留ボタン付き）でオーナーにpushする。
 * LINE_OWNER_USER_ID 未設定の場合はテキストブロードキャストにフォールバック。
 * LINE_CHANNEL_ACCESS_TOKEN 未設定の場合は null を返す。
 */
export async function notifyDmEntriesToOwner(entries) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;

  const ownerUserId = process.env.LINE_OWNER_USER_ID;

  if (!ownerUserId) {
    // フォールバック：全フォロワーへテキストブロードキャスト
    const high = entries.filter(e => e['確度'] === '高');
    const lines = [
      `📬 Instagram DM新着: ${entries.length}件`,
      high.length > 0 ? `  うち購入意向が高いもの: ${high.length}件` : '',
      '  → ShinCRAFT受注シート「受注見込み」タブを確認してください。',
      ...high.slice(0, 3).map(e => `  ・@${e['顧客名']}: ${e['元メッセージ'].slice(0, 40)}`),
    ];
    return broadcastToLine(lines.filter(Boolean).join('\n'));
  }

  // オーナーへFlexカルーセルでpush（最大10件/カルーセル）
  const bubbles = entries.slice(0, 10).map(buildDmBubble);
  const flexContent = bubbles.length === 1
    ? bubbles[0]
    : { type: 'carousel', contents: bubbles };

  const messages = [
    {
      type: 'flex',
      altText: `📬 IG DM新着 ${entries.length}件 — タップして承認/保留`,
      contents: flexContent,
    },
  ];

  if (entries.length > 10) {
    messages.push({
      type: 'text',
      text: `（他 ${entries.length - 10}件 — 受注シート「受注見込み」タブで確認）`,
    });
  }

  return pushMessageToUser(ownerUserId, messages);
}

function buildDmBubble(entry) {
  const conf = entry['確度'];
  const badge = conf === '高' ? '🔴高' : conf === '中' ? '🟡中' : '⚪低';
  const headerColor = conf === '高' ? '#c0392b' : conf === '中' ? '#d68910' : '#5d6d7e';
  const msgPreview = String(entry['元メッセージ'] || '（テキストなし）').slice(0, 100);
  const fp = encodeURIComponent(entry['fingerprint']);
  const name = entry['顧客名'] || '不明';

  return {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: headerColor,
      paddingAll: 'md',
      contents: [
        { type: 'text', text: `${badge} @${name}`, weight: 'bold', size: 'sm', color: '#ffffff' },
        { type: 'text', text: entry['受信日時'] || '', size: 'xxs', color: '#dddddd' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: 'md',
      contents: [
        { type: 'text', text: msgPreview, wrap: true, size: 'sm', color: '#333333' },
      ],
    },
    footer: {
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      paddingAll: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          height: 'sm',
          flex: 1,
          action: {
            type: 'postback',
            label: '✅ 承認',
            data: `action=dm_approve&fp=${fp}`,
            displayText: `@${name} を承認`,
          },
        },
        {
          type: 'button',
          style: 'secondary',
          height: 'sm',
          flex: 1,
          action: {
            type: 'postback',
            label: '⏸ 保留',
            data: `action=dm_hold&fp=${fp}`,
            displayText: `@${name} を保留`,
          },
        },
      ],
    },
  };
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
