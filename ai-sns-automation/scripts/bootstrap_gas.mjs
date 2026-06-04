// GASにトークン類を初回格納するスクリプト。
// GAS再デプロイ後に1回だけ実行する。以降はrefresh_token.mjsが自動更新する。
//
// 使い方:
//   META_ACCESS_TOKEN=<token> [FB_APP_SECRET=<secret>] node scripts/bootstrap_gas.mjs
//
// 必要env:
//   GAS_WEBAPP_URL, GAS_SHARED_TOKEN, META_ACCESS_TOKEN
//   FB_APP_SECRET（任意。後から別途格納も可）

const gasUrl = process.env.GAS_WEBAPP_URL;
const gasToken = process.env.GAS_SHARED_TOKEN;
const metaToken = process.env.META_ACCESS_TOKEN;
const fbSecret = process.env.FB_APP_SECRET || '';

if (!gasUrl) throw new Error('GAS_WEBAPP_URL が未設定です。');
if (!gasToken) throw new Error('GAS_SHARED_TOKEN が未設定です。');
if (!metaToken) throw new Error('META_ACCESS_TOKEN が未設定です。');

async function setConfig(key, value) {
  const res = await fetch(gasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: gasToken, action: 'setConfig', key, value }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(`setConfig(${key}) 失敗: ${JSON.stringify(data)}`);
  console.log(`✅ ${key} をGASに格納しました`);
}

await setConfig('META_ACCESS_TOKEN', metaToken);
if (fbSecret) await setConfig('FB_APP_SECRET', fbSecret);
else console.log('ℹ️  FB_APP_SECRET は未指定のためスキップ（トークン自動更新を使う場合は後で格納してください）');

console.log('\n✅ 初期化完了。InstagramチェックWorkflowを手動実行して動作確認してください。');
