#!/usr/bin/env bash
# ShinCRAFT — ローカル背景透過（APIキー不要）
# =====================================================================
# 用途: 1枚の画像の背景を rembg(U2-Net) で透過し、PNGとして出力する。
#       PhotoRoom等の外部APIキーは不要。処理はこの環境内で完結する。
#
# 使い方:
#   scripts/photoroom_remove_bg.sh <入力ファイル> <出力PNG>
#
# 補足:
#   - 初回は rembg の導入とモデル(約176MB)の取得を行うため時間がかかる。
#   - モデルは ~/.u2net/ にキャッシュされ、同一セッション内の2枚目以降は高速。
#   - Claude Code の Web実行環境は使い捨てのため、セッションが変わると
#     再導入・再取得が走る（`/photoroom` スキルがこの面倒を吸収する）。
# =====================================================================
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <input-image> <output-png>" >&2
  exit 2
fi

IN="$1"
OUT="$2"

if ! command -v rembg >/dev/null 2>&1; then
  echo "[setup] rembg を導入します（初回のみ）..." >&2
  pip3 install --quiet "rembg[cli]" onnxruntime pillow
fi

rembg i "$IN" "$OUT"
echo "[ok] $IN -> $OUT" >&2
