#!/bin/bash
# 台帳の未処理件数をチェックし、systemMessage として出力する。
# GAS_WEBAPP_URL / GAS_SHARED_TOKEN が未設定の場合は黙って終了。
[ -z "${GAS_WEBAPP_URL:-}" ] && exit 0
[ -z "${GAS_SHARED_TOKEN:-}" ] && exit 0
command -v node >/dev/null 2>&1 || exit 0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT/ai-sns-automation" || exit 0

node --input-type=module 2>/dev/null <<'JSEOF' || true
import { listRows } from './scripts/lib/ledger.mjs';
try {
  const rows = await listRows();
  const pending = rows.filter(r => ['未確認', '修正'].includes(r['ステータス'])).length;
  const approved = rows.filter(r => r['ステータス'] === '承認').length;
  if (pending + approved > 0) {
    console.log(JSON.stringify({
      systemMessage: `台帳: 未確認/修正 ${pending}件 / 承認済み(投稿待ち) ${approved}件。/sns で続きを進めてください。`
    }));
  }
} catch {}
JSEOF
