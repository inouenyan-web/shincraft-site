#!/bin/bash
# セッション開始・停止時に台帳状況と今日の優先タスクをシステムメッセージとして出力する。
[ -z "${GAS_WEBAPP_URL:-}" ] && exit 0
[ -z "${GAS_SHARED_TOKEN:-}" ] && exit 0
command -v node >/dev/null 2>&1 || exit 0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 運用ボードから最優先タスク行を抽出
BOARD_FILE="$REPO_ROOT/運用ボード.md"
TOP_TASKS=""
if [ -f "$BOARD_FILE" ]; then
  TOP_TASKS=$(awk '/^## 🔥 今の最優先/,/^---/' "$BOARD_FILE" \
    | grep -E '^[0-9]+\.' \
    | head -3 \
    | sed 's/\*\*//g' \
    | cut -c1-80)
fi

export TOP_TASKS
cd "$REPO_ROOT/ai-sns-automation" || exit 0

node --input-type=module 2>/dev/null <<'JSEOF' || true
import { listRows } from './scripts/lib/ledger.mjs';
try {
  const rows = await listRows();
  const pending = rows.filter(r => ['未確認', '修正'].includes(r['ステータス'])).length;
  const approved = rows.filter(r => r['ステータス'] === '承認').length;

  const topTasks = (process.env.TOP_TASKS || '').trim();
  const parts = [];

  if (topTasks) {
    const lines = topTasks.split('\n').filter(Boolean).map(t => '  ' + t.trim());
    parts.push('🔥 今の最優先:\n' + lines.join('\n'));
  }

  const ledgerLine = pending + approved > 0
    ? `📋 台帳: 未確認/修正 ${pending}件 / 承認済み(投稿待ち) ${approved}件`
    : '📋 台帳: 処理待ち行なし';
  parts.push(ledgerLine);
  parts.push('👉 /sns で作業開始  /1日まとめ で振り返り');

  console.log(JSON.stringify({ systemMessage: parts.join('\n') }));
} catch (e) {
  // GAS接続失敗時は台帳なしでボードだけ出す
  const topTasks = (process.env.TOP_TASKS || '').trim();
  if (topTasks) {
    const lines = topTasks.split('\n').filter(Boolean).map(t => '  ' + t.trim());
    const msg = '🔥 今の最優先:\n' + lines.join('\n') + '\n👉 /sns で作業開始';
    console.log(JSON.stringify({ systemMessage: msg }));
  }
}
JSEOF
