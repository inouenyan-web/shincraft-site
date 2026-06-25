// Gmail OAuth2 初期設定ヘルパー（1回だけ実行）
// GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET が設定された状態で実行すると
// ブラウザ認証URL を表示し、認証コードを入力させて GMAIL_REFRESH_TOKEN を取得する。
//
// 手順:
//   1. Google Cloud Console でプロジェクトを作成
//      https://console.cloud.google.com/
//   2. APIs & Services → OAuth consent screen を設定
//      スコープ: https://www.googleapis.com/auth/gmail.readonly
//   3. APIs & Services → Credentials → OAuth 2.0 Client IDs を作成
//      アプリの種類: 「デスクトップアプリ」
//      → client_id と client_secret を取得
//   4. Gmail API を有効化
//      APIs & Services → Enable APIs → Gmail API
//   5. 以下の環境変数を設定してこのスクリプトを実行:
//      GMAIL_CLIENT_ID=xxx.apps.googleusercontent.com
//      GMAIL_CLIENT_SECRET=GOCSPX-xxx
//   6. 表示されたURLをブラウザで開き、Googleアカウント（shincraft2023@gmail.com）で認証
//   7. 認証コードをコピーしてターミナルに貼り付ける
//   8. 表示された GMAIL_REFRESH_TOKEN を Claude Code 環境変数と GitHub Secrets に登録

import { createInterface } from 'node:readline';
import { google } from 'googleapis';

const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('エラー: GMAIL_CLIENT_ID と GMAIL_CLIENT_SECRET を環境変数に設定してから実行してください。');
  console.error('');
  console.error('例:');
  console.error('  GMAIL_CLIENT_ID=xxx.apps.googleusercontent.com GMAIL_CLIENT_SECRET=GOCSPX-xxx node scripts/gmail_oauth_setup.mjs');
  process.exit(1);
}

const auth = new google.auth.OAuth2(
  clientId,
  clientSecret,
  'urn:ietf:wg:oauth:2.0:oob'
);

const authUrl = auth.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.readonly'],
  prompt: 'consent',
});

console.log('='.repeat(60));
console.log('Gmail OAuth2 初期設定');
console.log('='.repeat(60));
console.log('');
console.log('1. 以下のURLをブラウザで開いてください:');
console.log('');
console.log(authUrl);
console.log('');
console.log('2. shincraft2023@gmail.com でGoogleアカウントにログインし、');
console.log('   「このアプリは確認されていません」の警告が出ても「詳細設定」→「続行」');
console.log('   Gmail の読み取り権限を許可する');
console.log('');
console.log('3. 表示された認証コードをここに貼り付けてEnterを押してください:');

const rl = createInterface({ input: process.stdin, output: process.stdout });

rl.question('認証コード: ', async (code) => {
  rl.close();
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    console.error('認証コードが入力されませんでした。');
    process.exit(1);
  }

  try {
    const { tokens } = await auth.getToken(trimmedCode);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      console.error('');
      console.error('エラー: refresh_token が取得できませんでした。');
      console.error('Google Cloud Console → OAuth Consent Screen でテストユーザーを追加したか確認してください。');
      console.error('または、既存の権限を一旦取り消してから再実行してください:');
      console.error('  https://myaccount.google.com/permissions でこのアプリを削除 → 再実行');
      process.exit(1);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ 取得成功！');
    console.log('='.repeat(60));
    console.log('');
    console.log('以下の GMAIL_REFRESH_TOKEN を登録してください:');
    console.log('');
    console.log(`GMAIL_REFRESH_TOKEN = ${refreshToken}`);
    console.log('');
    console.log('登録先（2か所）:');
    console.log('  1. Claude Code Webの「環境変数」設定');
    console.log('     （/sns 等のセッション内で使う場合）');
    console.log('  2. GitHub → Settings → Secrets → Actions → New repository secret');
    console.log('     名前: GMAIL_REFRESH_TOKEN');
    console.log('     （inbox-check.yml の GitHub Actions で使う場合）');
    console.log('');
    console.log('GMAIL_CLIENT_ID と GMAIL_CLIENT_SECRET も同様に両方に登録が必要です。');
  } catch (e) {
    console.error('');
    console.error('トークン取得失敗:', e.message);
    console.error('認証コードが正しいか確認してください。コードは1回しか使えません。');
    process.exit(1);
  }
});
