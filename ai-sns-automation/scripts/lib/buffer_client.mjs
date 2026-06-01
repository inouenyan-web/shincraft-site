// Buffer Publish API クライアント（Instagram投稿用）
// 必要env: BUFFER_ACCESS_TOKEN, BUFFER_INSTAGRAM_PROFILE_ID

import { requireEnv } from './env.mjs';

const BUFFER_API = 'https://api.bufferapp.com/1/updates/create.json';

/**
 * Bufferを通じてInstagramに投稿する。
 * @param {object} opts
 * @param {string} opts.text         投稿本文（ハッシュタグ含む）
 * @param {string} [opts.imageUrl]   公開アクセス可能な画像URL
 * @param {boolean} [opts.now]       true=即時投稿（default: true）
 * @param {string} [opts.scheduledAt] ISO 8601形式の予約日時（nowがfalseの場合）
 * @returns {{ bufferId: string, status: string }}
 */
export async function postToBuffer({ text, imageUrl, now = true, scheduledAt = null }) {
  const env = requireEnv(['BUFFER_ACCESS_TOKEN', 'BUFFER_INSTAGRAM_PROFILE_ID']);

  const params = new URLSearchParams();
  params.append('access_token', env.BUFFER_ACCESS_TOKEN);
  params.append('profile_ids[]', env.BUFFER_INSTAGRAM_PROFILE_ID);
  params.append('text', text);
  if (imageUrl) params.append('media[picture]', imageUrl);
  if (now) {
    params.append('now', 'true');
  } else if (scheduledAt) {
    params.append('scheduled_at', scheduledAt);
  }

  const res = await fetch(BUFFER_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Buffer APIがJSONを返しませんでした（HTTP ${res.status}）`);
  }

  if (!data.success) {
    throw new Error('Buffer APIエラー: ' + (data.message || JSON.stringify(data)));
  }

  const update = data.updates?.[0];
  return {
    bufferId: update?.id ?? '',
    status: update?.status ?? 'queued',
  };
}

/**
 * Google Drive共有URLを直接ダウンロードURLへ変換する。
 * Buffer はDriveの共有ページURLを読めないため、direct URLが必要。
 */
export function toDirectImageUrl(url) {
  if (!url) return url;
  // https://drive.google.com/file/d/FILE_ID/view... → direct download URL
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  return url;
}
