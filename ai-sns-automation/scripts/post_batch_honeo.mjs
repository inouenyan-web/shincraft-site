// @honeo_honeo アカウント向け 5件一括投稿スクリプト
// 使い方: node scripts/post_batch_honeo.mjs [--dry-run]
//
// 必要な環境変数: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET

import { postTweet } from "./lib/x_client.mjs";

const TWEETS = [
  `パソコンができる人を、ただの「作業係」にしておくのは損だ。
#11 パソコンが使える人を、ただの便利屋で終わらせたらもったいない。｜病院事務の男｜おしん　業務改善に孤軍奮闘中
https://note.com/oshin_2026/n/ne33d1723eeb6?sub_rt=share_pw`,

  `便利屋で終わる事務員と、仕組みを作る事務員では、評価が変わる。
#12 病院で働く男の事務員は、便利屋で終わってはいけない。｜病院事務の男｜おしん　業務改善に孤軍奮闘中
https://note.com/oshin_2026/n/n5984eb7fd27d?sub_rt=share_pw`,

  `病院事務を「受付・会計だけ」だと思っている人に、伝えたいことがある。
#13 病院事務は、医療事務だけではない。｜病院事務の男｜おしん　業務改善に孤軍奮闘中
https://note.com/oshin_2026/n/ndaa699de412e?sub_rt=share_pw`,

  `「できて当たり前」と言われる仕事ほど、なくなった時に困る。
#14 バックオフィスの仕事は、"できていて当たり前"にされやすい。｜病院事務の男｜おしん　業務改善に孤軍奮闘中
https://note.com/oshin_2026/n/nba4bd19a02e7?sub_rt=share_pw`,

  `安定してるからこそ、気づいたら選択肢が減っていた。
#15 男性病院事務は、安定だけでは将来が細くなりやすい。｜病院事務の男｜おしん　業務改善に孤軍奮闘中
https://note.com/oshin_2026/n/na5ae330829a0?sub_rt=share_pw`,
];

const isDryRun = process.argv.includes("--dry-run");

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`投稿モード: ${isDryRun ? "dry-run（実投稿なし）" : "実投稿"}`);
  console.log(`対象: ${TWEETS.length}件\n`);

  const results = [];

  for (let i = 0; i < TWEETS.length; i++) {
    const text = TWEETS[i];
    console.log(`--- [${i + 1}/${TWEETS.length}] ---`);
    console.log(text);

    if (isDryRun) {
      console.log("[dry-run] スキップ\n");
      results.push({ i: i + 1, ok: true, dryRun: true });
      continue;
    }

    try {
      const res = await postTweet({ text });
      console.log(`✓ 投稿完了: ${res.url}\n`);
      results.push({ i: i + 1, ok: true, ...res });
    } catch (e) {
      console.error(`✗ 投稿失敗: ${e.message || e}\n`);
      results.push({ i: i + 1, ok: false, error: String(e.message || e) });
    }

    // 連続投稿の間隔（レート制限対策）
    if (i < TWEETS.length - 1) {
      console.log("3秒待機...");
      await sleep(3000);
    }
  }

  console.log("\n===== 結果サマリー =====");
  for (const r of results) {
    if (r.dryRun) {
      console.log(`[${r.i}] dry-run`);
    } else if (r.ok) {
      console.log(`[${r.i}] ✓ ${r.url}`);
    } else {
      console.log(`[${r.i}] ✗ ${r.error}`);
    }
  }

  const failed = results.filter((r) => !r.ok && !r.dryRun);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("予期せぬエラー:", e);
  process.exit(1);
});
