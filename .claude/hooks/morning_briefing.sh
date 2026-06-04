#!/bin/bash
# セッション開始時に「今日のブリーフィング」を表示する。
# 最優先タスク・台帳状況・最新Instagramチェック結果を1画面にまとめる。

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

command -v node >/dev/null 2>&1 || exit 0
cd "$REPO_ROOT/ai-sns-automation" || exit 0

node scripts/daily_briefing.mjs 2>/dev/null || true
