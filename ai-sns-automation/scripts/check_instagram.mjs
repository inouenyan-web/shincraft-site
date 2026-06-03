// @shincraft2023 のInstagramを自動チェックする（読み取り専用）。
// 最新投稿のエンゲージメント・コメント（返信漏れ）・アカウント概要をまとめて表示する。
//
// 使い方:
//   node scripts/check_instagram.mjs            # 最新5件をチェック
//   node scripts/check_instagram.mjs --limit 8  # 件数指定
//
// 必要env: IG_USER_ID, META_ACCESS_TOKEN（SETUP_SECRETS.md 8章）
// 未設定の場合は、Chrome版Claudeへ貼れる手動チェック用プロンプトを出力する。

import {
  getAccount,
  getRecentMedia,
  getMediaComments,
  getAccountInsights,
} from './lib/instagram_client.mjs';

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? Number(process.argv[limitArg + 1]) || 5 : 5;

const jst = (iso) =>
  new Date(iso).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const oneLine = (s, n = 60) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t || '（本文なし）';
};

// 環境変数が無い場合は、聞かれる前にChrome版フォールバックを出す（運用ボードの先回りルール）。
function printChromeFallback() {
  console.log('⚠️ Instagram Graph APIの認証情報（IG_USER_ID / META_ACCESS_TOKEN）が未設定です。');
  console.log('   セットアップ手順は SETUP_SECRETS.md「8. Instagram Graph API（チェック用）」を参照。');
  console.log('   設定が済むまでは、以下をChrome版Claudeに貼って手動チェックしてください。\n');
  console.log('--- ここからコピー ---');
  console.log(`@shincraft2023 のInstagramを以下の観点で精査してください。

【確認項目】
1. 最新${LIMIT}件の投稿内容・投稿日・いいね数・コメント数
2. 6月の出店告知投稿は公開されているか
3. ニンジャキーホルダー（名入れ）の投稿は公開されているか
4. プロフィール文・ハイライト・フォロワー数に変更が必要な点はないか
5. コメントへの返信漏れ・DM未読はないか（確認できる範囲で）

結果を箇条書きで簡潔にまとめてください。`);
  console.log('--- ここまでコピー ---');
}

async function main() {
  const account = await getAccount();
  console.log(`📷 @${account.username}（${account.name || ''}）`);
  console.log(
    `   フォロワー ${account.followers_count} / フォロー ${account.follows_count} / 投稿 ${account.media_count}\n`
  );

  const insights = await getAccountInsights();
  if (insights.length) {
    const fmt = insights
      .map((m) => `${m.name}=${m.values?.[0]?.value ?? '-'}`)
      .join(' / ');
    console.log(`📊 本日インサイト: ${fmt}\n`);
  }

  const media = await getRecentMedia(LIMIT);
  console.log(`🗂 最新${media.length}件:\n`);

  let unrepliedTotal = 0;
  for (const m of media) {
    console.log(`▶ ${jst(m.timestamp)}  ❤️${m.like_count ?? 0}  💬${m.comments_count ?? 0}  [${m.media_type}]`);
    console.log(`  ${oneLine(m.caption)}`);
    console.log(`  ${m.permalink}`);

    if (m.comments_count > 0) {
      const comments = await getMediaComments(m.id, 10);
      // 自分のアカウント以外のコメントで、返信(replies)が付いていないもの＝返信漏れ候補
      const unreplied = comments.filter(
        (c) => c.username !== account.username && !(c.replies && c.replies.data && c.replies.data.length)
      );
      if (unreplied.length) {
        unrepliedTotal += unreplied.length;
        console.log(`  ⚠️ 返信漏れ候補 ${unreplied.length}件:`);
        for (const c of unreplied.slice(0, 3)) {
          console.log(`     - @${c.username}: ${oneLine(c.text, 40)}`);
        }
      }
    }
    console.log('');
  }

  console.log('─'.repeat(40));
  console.log(`✅ チェック完了。返信漏れ候補 合計${unrepliedTotal}件。`);
  console.log('   ※ DM受信箱はGraph APIの対象外（Messenger審査が別途必要）のため未確認です。');
}

main().catch((err) => {
  if (/必要な環境変数が未設定/.test(err.message)) {
    printChromeFallback();
    process.exit(0);
  }
  console.error('チェック失敗:', err.message);
  process.exit(1);
});
