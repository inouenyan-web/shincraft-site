// Google Sheets 投稿管理台帳クライアント。
// サービスアカウントを使わず、Apps Script Web App(JSON API)経由で読み書きする。
// 必要env: GAS_WEBAPP_URL, GAS_SHARED_TOKEN

import { requireEnv } from "./env.mjs";

/**
 * Apps Script Web App にPOSTし、JSONを返す。
 * @param {object} body action と引数を含むペイロード
 */
async function callGas(body) {
  const env = requireEnv(["GAS_WEBAPP_URL", "GAS_SHARED_TOKEN"]);
  const res = await fetch(env.GAS_WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: env.GAS_SHARED_TOKEN, ...body }),
    redirect: "follow", // Apps Scriptはscript.googleusercontent.comへリダイレクトする
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (_) {
    throw new Error("Apps Scriptの応答がJSONではありません: " + text.slice(0, 300));
  }
  if (!json.ok) {
    throw new Error("Apps Scriptエラー: " + (json.error || JSON.stringify(json)));
  }
  return json;
}

/** 投稿管理シートの全行をオブジェクト配列で取得 */
export async function listRows() {
  const json = await callGas({ action: "list", sheet: "投稿管理" });
  return json.rows || [];
}

/** ステータスが指定値の行だけ取得 */
export async function listRowsByStatus(status) {
  const rows = await listRows();
  return rows.filter((r) => String(r["ステータス"] || "").trim() === status);
}

/**
 * 管理IDで行を特定して列を更新する。
 * @param {string} managementId
 * @param {Record<string,string>} updates 列名→値
 */
export async function updateRowByManagementId(managementId, updates) {
  return callGas({
    action: "update",
    sheet: "投稿管理",
    keyColumn: "管理ID",
    keyValue: managementId,
    updates,
  });
}

/** 行を追加する（列名→値） */
export async function appendRow(values) {
  return callGas({ action: "append", sheet: "投稿管理", values });
}

/** 任意シートの操作（note連携シートなど）に使う低レベルAPI */
export { callGas };
