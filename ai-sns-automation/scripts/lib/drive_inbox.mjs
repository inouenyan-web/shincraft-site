// Drive受信箱クライアント（GASルート）。
//
// 【2つの書き込み経路】
//   A) Claude Codeセッション内（Drive MCPが使えるとき）:
//      Drive MCP の create_file で AIフォルダに「タスク_xxx」Docを直接作成する。
//      GASデプロイ不要・即使える。
//      AI親フォルダID: 1Nl5ksVJuwEuDZgyb0jr9V6Os9YLzGBcj
//      Cowork起動手順 Doc: 1kw3DtfJOaKv2KY-wqqCvdJHc-vUjKtuJ5poxEC14yQw
//
//   B) Node.jsスクリプト／GitHub Actionsから呼ぶ場合（このモジュール）:
//      GAS appendToDoc 経由で受信箱Docに追記する。
//      GASの再デプロイ（1回だけ）が必要。
//      受信箱Doc ID: 1alE6ds2j-iGG-n_vG1wslVuZfo19q-z66ibJiLvd2_g
//
// 必要env: GAS_WEBAPP_URL, GAS_SHARED_TOKEN

import { callGas } from "./ledger.mjs";

const INBOX_DOC_ID = "1alE6ds2j-iGG-n_vG1wslVuZfo19q-z66ibJiLvd2_g";

/**
 * タスクを受信箱に書き込む。
 * @param {object} params
 * @param {string} params.from    送信元（エージェント名）例: "sns-text-generator"
 * @param {string} params.to      宛先 "cowork" | "chat" | "chrome"
 * @param {string} params.priority "high" | "normal" | "low"
 * @param {string} params.type    タスク種別 "browser_operation" | "approval" | "data_entry" 等
 * @param {string} params.title   短いタイトル
 * @param {string} params.instructions  Cowork/Chatへの具体的な指示（実行可能なレベル）
 * @param {string} params.expectedOutput 何を返してほしいか
 * @returns {{ id: string }}  書き込んだタスクのID
 */
export async function writeTask({ from, to, priority = "normal", type, title, instructions, expectedOutput }) {
  const jst = new Date(Date.now() + 9 * 3600 * 1000);
  const ts = jst.toISOString().slice(0, 16).replace("T", " ");
  const id = `task-${Date.now()}`;

  const lines = [
    ``,
    `## [${ts}] ${title}`,
    `[宛先: ${to}]  [status: pending]  [id: ${id}]`,
    `**送信元**: ${from}  **優先度**: ${priority}  **種別**: ${type}`,
    ``,
    `### 指示`,
    instructions,
    ``,
    `### 期待する出力`,
    expectedOutput,
    `---`,
  ];

  await callGas({ action: "appendToDoc", docId: INBOX_DOC_ID, content: lines.join("\n") });
  console.log(`[drive_inbox] タスク書き込み完了: ${id} → ${to} (${title})`);
  return { id };
}

/**
 * 受信箱の全文を取得する。
 * @returns {string}
 */
export async function readInbox() {
  const res = await callGas({ action: "readDoc", docId: INBOX_DOC_ID });
  return res.content;
}

// --- CLI ---
// node scripts/lib/drive_inbox.mjs --read
// node scripts/lib/drive_inbox.mjs --write '{"from":"test","to":"cowork","type":"browser_operation","title":"テスト","instructions":"手順","expectedOutput":"確認"}'

if (process.argv[1].endsWith("drive_inbox.mjs")) {
  const flag = process.argv[2];
  if (flag === "--read") {
    const text = await readInbox();
    console.log(text);
  } else if (flag === "--write") {
    const params = JSON.parse(process.argv[3] || "{}");
    const { id } = await writeTask(params);
    console.log("書き込み完了:", id);
  } else {
    console.log("使い方: node drive_inbox.mjs --read | --write '{...}'");
  }
}
