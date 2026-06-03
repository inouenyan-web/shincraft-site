// Instagram Graph API クライアント（アカウントの閲覧・チェック用・読み取り専用）
// 必要env: IG_USER_ID, META_ACCESS_TOKEN
//
// IG_USER_ID        … Instagram Business/Creator アカウントの ID（数値）
// META_ACCESS_TOKEN … instagram_basic / instagram_manage_insights 権限を持つ長期トークン
//
// 取得方法は SETUP_SECRETS.md の「8. Instagram Graph API（チェック用）」を参照。
// DM（受信箱）は Messenger Platform の別審査が必要なため、本クライアントの対象外。

import { requireEnv } from './env.mjs';

const GRAPH_VERSION = 'v21.0';
const GRAPH_API = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * Graph API に GET し、JSONを返す。失敗時は分かりやすいエラーを投げる。
 * @param {string} path  例: '/{ig-user-id}/media'
 * @param {Record<string,string>} params  access_token 以外のクエリ
 */
async function graphGet(path, params = {}) {
  const env = requireEnv(['IG_USER_ID', 'META_ACCESS_TOKEN']);
  const url = new URL(GRAPH_API + path.replace('{ig-user-id}', env.IG_USER_ID));
  url.searchParams.set('access_token', env.META_ACCESS_TOKEN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, { method: 'GET' });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Graph APIがJSONを返しませんでした（HTTP ${res.status}）`);
  }
  if (data.error) {
    const e = data.error;
    throw new Error(`Graph APIエラー: ${e.message}（type=${e.type}, code=${e.code}）`);
  }
  return data;
}

/** アカウント概要（ユーザー名・フォロワー数・投稿数） */
export async function getAccount() {
  return graphGet('/{ig-user-id}', {
    fields: 'username,name,followers_count,follows_count,media_count',
  });
}

/**
 * 最新メディア（投稿）を取得する。
 * @param {number} limit 取得件数（default 5）
 */
export async function getRecentMedia(limit = 5) {
  const data = await graphGet('/{ig-user-id}/media', {
    fields: 'id,caption,media_type,permalink,timestamp,like_count,comments_count',
    limit: String(limit),
  });
  return data.data || [];
}

/**
 * 指定メディアのコメントを取得する（返信漏れチェック用）。
 * @param {string} mediaId
 * @param {number} limit
 */
export async function getMediaComments(mediaId, limit = 10) {
  const data = await graphGet(`/${mediaId}/comments`, {
    fields: 'text,username,timestamp,like_count,replies.limit(1){id}',
    limit: String(limit),
  });
  return data.data || [];
}

/**
 * アカウントインサイト（直近のリーチなど）。
 * 取得できない権限・プランの場合は空を返す（チェックは継続する）。
 */
export async function getAccountInsights() {
  try {
    const data = await graphGet('/{ig-user-id}/insights', {
      metric: 'reach,profile_views',
      period: 'day',
    });
    return data.data || [];
  } catch {
    return [];
  }
}
