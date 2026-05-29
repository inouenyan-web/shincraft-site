// 単発でXに投稿するCLI。
// 使い方:
//   node scripts/post_to_x.mjs --text "本文" [--image ./path.jpg]
//   echo "本文" | node scripts/post_to_x.mjs --image ./path.jpg
//
// Claude Codeはこのスクリプトを直接呼び出して投稿できる。

import { postTweet } from "./lib/x_client.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--text") args.text = argv[++i];
    else if (a === "--image") args.image = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
  }
  return args;
}

async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8").trim();
}

const args = parseArgs(process.argv.slice(2));
const text = args.text || (await readStdin());

if (!text) {
  console.error("本文がありません。--text または標準入力で渡してください。");
  process.exit(1);
}

if (args.dryRun) {
  console.log("[dry-run] X投稿予定:\n" + text + (args.image ? `\n[画像] ${args.image}` : ""));
  process.exit(0);
}

try {
  const res = await postTweet({ text, imagePath: args.image });
  console.log(JSON.stringify({ ok: true, ...res }));
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(1);
}
