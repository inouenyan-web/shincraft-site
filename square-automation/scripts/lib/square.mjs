// Square Catalog API クライアント（外部依存なし。Node 22+ の fetch / crypto を使用）。
// 必要env: SQUARE_ACCESS_TOKEN（スコープ: ITEMS_READ, ITEMS_WRITE）
// 任意env:
//   SQUARE_ENV     … prod | sandbox（既定 prod）
//   SQUARE_VERSION … 指定時のみ Square-Version ヘッダを送出（未指定ならトークン既定のAPI版を使用）
//
// 秘密情報は環境変数のみ。コード/Gitに直書きしないこと。

import { randomUUID } from "node:crypto";

const HOSTS = {
  prod: "https://connect.squareup.com",
  sandbox: "https://connect.squareupsandbox.com",
};

function baseUrl() {
  const env = (process.env.SQUARE_ENV || "prod").toLowerCase();
  const url = HOSTS[env];
  if (!url) throw new Error(`SQUARE_ENV は prod か sandbox を指定してください（現在: ${env}）`);
  return url;
}

function authHeaders() {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token || token.trim() === "") {
    throw new Error(
      "SQUARE_ACCESS_TOKEN が未設定です。ITEMS_READ/ITEMS_WRITE スコープのトークンを環境変数に登録してください（README参照）。"
    );
  }
  const h = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const ver = process.env.SQUARE_VERSION;
  if (ver && ver.trim() !== "") h["Square-Version"] = ver.trim();
  return h;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * リトライ付き JSON POST。429 / 5xx は指数バックオフ（2s,4s,8s,16s）で再試行。
 */
export async function squarePost(path, body, { retries = 4 } = {}) {
  const url = baseUrl() + path;
  // ヘッダ生成（トークン未設定など設定エラー）はリトライ前に確定させ、即時に失敗させる
  const headers = authHeaders();
  const payload = JSON.stringify(body);
  let attempt = 0;
  for (;;) {
    let res;
    try {
      res = await fetch(url, { method: "POST", headers, body: payload });
    } catch (e) {
      // ネットワーク到達不可（許可リスト未設定など）
      if (attempt >= retries) {
        throw new Error(
          `Square へ接続できません: ${String(e.message || e)}\n` +
            `→ ネットワーク許可リストに ${baseUrl().replace("https://", "")} が含まれているか確認してください。`
        );
      }
    }
    if (res) {
      if (res.status === 429 || res.status >= 500) {
        if (attempt >= retries) return finalize(res);
      } else {
        return finalize(res);
      }
    }
    await sleep(Math.pow(2, attempt) * 1000);
    attempt++;
  }
}

async function finalize(res) {
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch (_) {
    throw new Error(`Square応答がJSONではありません(HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok || (json.errors && json.errors.length)) {
    const msg =
      (json.errors || []).map((e) => `${e.category}/${e.code}: ${e.detail || ""}`).join("; ") ||
      `HTTP ${res.status}`;
    const err = new Error(`Squareエラー: ${msg}`);
    err.status = res.status;
    err.errors = json.errors;
    throw err;
  }
  return json;
}

/**
 * ITEM タイプのカタログオブジェクトを全件取得（カーソルでページング）。
 * @returns {Promise<object[]>} CatalogObject(type=ITEM) の配列
 */
export async function listAllItems() {
  const items = [];
  let cursor;
  do {
    const body = { object_types: ["ITEM"], include_related_objects: false };
    if (cursor) body.cursor = cursor;
    const json = await squarePost("/v2/catalog/search-catalog-objects", body);
    for (const o of json.objects || []) items.push(o);
    cursor = json.cursor;
  } while (cursor);
  return items;
}

/**
 * オブジェクト配列をバッチ更新（batch-upsert）。chunkSize 件ずつ分割して送信。
 * 各リクエストに idempotency_key を付与（再送安全）。
 */
export async function batchUpsert(objects, { chunkSize = 200 } = {}) {
  const results = [];
  for (let i = 0; i < objects.length; i += chunkSize) {
    const chunk = objects.slice(i, i + chunkSize);
    const body = { idempotency_key: randomUUID(), batches: [{ objects: chunk }] };
    const json = await squarePost("/v2/catalog/batch-upsert-catalog-objects", body);
    results.push(json);
  }
  return results;
}
