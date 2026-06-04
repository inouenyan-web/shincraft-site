// Instagram(Meta)長期アクセストークンを延長し、GASのScript Propertiesに保存する。
// GitHub Actions上で月2回実行する想定（instagram-token-refresh.yml）。
//
// 長期トークンは「有効なうちに再交換」すれば新しい60日トークンになる。
// 定期実行し続ける限りトークンが失効しない。GH_PATは不要。
//
// 必要env:
//   GAS_WEBAPP_URL   … GASウェブアプリURL（GitHub Secret: GAS_WEBAPP_URL）
//   GAS_SHARED_TOKEN … GAS認証トークン（GitHub Secret: GAS_SHARED_TOKEN）

const GRAPH = 'https://graph.facebook.com/v21.0';
const FB_APP_ID = '1514359383812081';

const gasUrl = process.env.GAS_WEBAPP_URL;
const gasToken = process.env.GAS_SHARED_TOKEN;
if (!gasUrl || !gasToken) {
  throw new Error('GAS_WEBAPP_URL または GAS_SHARED_TOKEN が未設定です。');
}

async function gasRequest(body) {
  const res = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: gasToken, ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(`GASエラー: ${data.error || JSON.stringify(data)}`);
  return data;
}

// 1) GASから現在のトークンとApp Secretを取得
const { value: currentToken } = await gasRequest({ action: 'getConfig', key: 'META_ACCESS_TOKEN' });
const { value: appSecret } = await gasRequest({ action: 'getConfig', key: 'FB_APP_SECRET' });

// 2) Meta APIでトークンを再交換して60日延長
const u = new URL(`${GRAPH}/oauth/access_token`);
u.searchParams.set('grant_type', 'fb_exchange_token');
u.searchParams.set('client_id', FB_APP_ID);
u.searchParams.set('client_secret', appSecret);
u.searchParams.set('fb_exchange_token', currentToken);

const exRes = await fetch(u);
const exData = await exRes.json().catch(() => ({}));
if (!exData.access_token) {
  throw new Error('トークン延長に失敗しました: ' + JSON.stringify(exData));
}
const newToken = exData.access_token;
const days = exData.expires_in ? Math.round(exData.expires_in / 86400) : '不明';
console.log(`新しい長期トークンを取得（有効期限 約${days}日）`);

// 3) 新トークンをGASに保存
await gasRequest({ action: 'setConfig', key: 'META_ACCESS_TOKEN', value: newToken });
console.log('✅ 新しいトークンをGASに保存しました。次回チェックから自動的に使われます。');
