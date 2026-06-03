// Instagram(Meta)長期アクセストークンを延長し、GitHub Actions Secretを自動更新する。
// GitHub Actions上で月2回実行する想定（.github/workflows/instagram-token-refresh.yml）。
//
// 長期トークンは「有効なうちに再交換」すれば新しい60日トークンに更新できる。
// 定期実行し続ける限りトークンが失効しないため、手動での再取得が不要になる。
//
// 必要env:
//   META_ACCESS_TOKEN … 現在有効な長期トークン（延長の種にする）
//   FB_APP_ID         … Metaアプリ ID
//   FB_APP_SECRET     … Metaアプリ シークレット
//   GH_PAT            … repoのActions Secretを更新できるGitHub PAT（secrets: read/write）
//   GITHUB_REPOSITORY … "owner/repo"（GitHub Actionsが自動で渡す）

import _sodium from 'libsodium-wrappers';
import { requireEnv } from './lib/env.mjs';

const GRAPH = 'https://graph.facebook.com/v21.0';
const GH = 'https://api.github.com';

const env = requireEnv(['META_ACCESS_TOKEN', 'FB_APP_ID', 'FB_APP_SECRET', 'GH_PAT']);
const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  throw new Error('GITHUB_REPOSITORY が未設定です（GitHub Actions上で実行してください）。');
}

// 1) 長期トークンを再交換して新しい60日トークンを得る
const u = new URL(`${GRAPH}/oauth/access_token`);
u.searchParams.set('grant_type', 'fb_exchange_token');
u.searchParams.set('client_id', env.FB_APP_ID);
u.searchParams.set('client_secret', env.FB_APP_SECRET);
u.searchParams.set('fb_exchange_token', env.META_ACCESS_TOKEN);

const exRes = await fetch(u);
const exData = await exRes.json().catch(() => ({}));
if (!exData.access_token) {
  throw new Error('トークン延長に失敗しました: ' + JSON.stringify(exData));
}
const newToken = exData.access_token;
const days = exData.expires_in ? Math.round(exData.expires_in / 86400) : '不明';
console.log(`新しい長期トークンを取得（有効期限 約${days}日）`);

// 2) リポジトリのActions公開鍵を取得
const ghHeaders = {
  Authorization: `Bearer ${env.GH_PAT}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};
const keyRes = await fetch(`${GH}/repos/${repo}/actions/secrets/public-key`, { headers: ghHeaders });
if (!keyRes.ok) {
  throw new Error(`公開鍵の取得に失敗（HTTP ${keyRes.status}）: ${await keyRes.text()}`);
}
const { key, key_id } = await keyRes.json();

// 3) 新トークンをlibsodium(sealed box)で暗号化（GitHub Secretsの仕様）
await _sodium.ready;
const sodium = _sodium;
const encrypted = sodium.to_base64(
  sodium.crypto_box_seal(
    sodium.from_string(newToken),
    sodium.from_base64(key, sodium.base64_variants.ORIGINAL)
  ),
  sodium.base64_variants.ORIGINAL
);

// 4) Secret「META_ACCESS_TOKEN」を更新
const putRes = await fetch(`${GH}/repos/${repo}/actions/secrets/META_ACCESS_TOKEN`, {
  method: 'PUT',
  headers: { ...ghHeaders, 'Content-Type': 'application/json' },
  body: JSON.stringify({ encrypted_value: encrypted, key_id }),
});
if (putRes.status !== 201 && putRes.status !== 204) {
  throw new Error(`Secret更新に失敗（HTTP ${putRes.status}）: ${await putRes.text()}`);
}
console.log('✅ GitHub Secret「META_ACCESS_TOKEN」を更新しました。次回チェックから新トークンが使われます。');
