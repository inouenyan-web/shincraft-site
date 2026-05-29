// X（旧Twitter）投稿クライアント。
// OAuth 1.0a ユーザーコンテキストを使用（単一アカウントのbot用途で最も簡単）。
// 投稿: POST api.x.com/2/tweets / 画像: v2 media upload（ライブラリが処理）。

import { TwitterApi } from "twitter-api-v2";
import { readFile } from "node:fs/promises";
import { requireEnv } from "./env.mjs";

/**
 * 環境変数からXクライアントを生成する。
 * 必要env: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
 */
export function createXClient() {
  const env = requireEnv(["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET"]);
  return new TwitterApi({
    appKey: env.X_API_KEY,
    appSecret: env.X_API_SECRET,
    accessToken: env.X_ACCESS_TOKEN,
    accessSecret: env.X_ACCESS_SECRET,
  });
}

/**
 * Xへ投稿する。画像パスを渡すと添付する（任意）。
 * @param {object} opts
 * @param {string} opts.text 投稿本文
 * @param {string} [opts.imagePath] 添付画像のローカルパス
 * @returns {Promise<{id:string,url:string}>}
 */
export async function postTweet({ text, imagePath }) {
  if (!text || String(text).trim() === "") {
    throw new Error("投稿本文(text)が空です。");
  }
  const client = createXClient();

  let media;
  if (imagePath) {
    const buf = await readFile(imagePath);
    const type = imagePath.toLowerCase().endsWith(".png") ? "png" : "jpg";
    const mediaId = await client.v1.uploadMedia(buf, { mimeType: `image/${type}` });
    media = { media_ids: [mediaId] };
  }

  const res = await client.v2.tweet(media ? { text, media } : { text });
  const id = res.data.id;
  // ユーザー名はme()で取得できるが、リンク生成にはidだけで十分（iは自分のhandleにリダイレクト）。
  return { id, url: `https://x.com/i/web/status/${id}` };
}
