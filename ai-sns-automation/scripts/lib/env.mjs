// 環境変数の読み込みと検証ヘルパー。
// 秘密情報は必ず環境変数（Claude Code Web環境のenv設定）から渡す。
// GitHubには絶対に保存しない。

/**
 * 指定したキーの環境変数を取得する。未設定なら分かりやすいエラーを投げる。
 * @param {string[]} keys
 * @returns {Record<string,string>}
 */
export function requireEnv(keys) {
  const missing = keys.filter((k) => !process.env[k] || String(process.env[k]).trim() === "");
  if (missing.length > 0) {
    throw new Error(
      [
        "必要な環境変数が未設定です: " + missing.join(", "),
        "",
        "Claude Code Web環境の『環境変数』設定に追加してください。",
        "設定項目の一覧は ai-sns-automation/SETUP_SECRETS.md を参照。",
      ].join("\n")
    );
  }
  const out = {};
  for (const k of keys) out[k] = process.env[k];
  return out;
}

/**
 * 任意の環境変数を取得する（未設定ならデフォルト）。
 */
export function optionalEnv(key, fallback = "") {
  const v = process.env[key];
  return v && String(v).trim() !== "" ? v : fallback;
}
