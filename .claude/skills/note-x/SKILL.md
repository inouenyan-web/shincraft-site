---
name: note-x
description: noteに投稿した記事をXにもリンク付きで同時投稿（クロスポスト）する。noteのRSSを見て未投稿の新着だけをXへ投稿し、重複防止の記録を残す。スマホから「/note-x」で起動。
---

# /note-x — note → X クロスポスト

noteの新着記事を、Xへリンク付きで投稿する。`ai-sns-automation/CLAUDE.md` の原則に従う。

## 手順

### 1. 対象を確認（dry-run）
```bash
cd ai-sns-automation && node scripts/note_to_x.mjs --dry-run
```
- `NOTE_USERNAME` 未設定なら `SETUP_SECRETS.md` を案内して設定を促す。
- 表示された投稿予定の本文・リンクを井上さんに見せて確認する。

### 2. 実投稿
```bash
cd ai-sns-automation && node scripts/note_to_x.mjs
```
- 投稿済みのRSS guid は「note連携」シートに記録され、次回以降は重複投稿しない。
- 投稿文テンプレートは環境変数 `NOTE_X_TEMPLATE`（`{title}` `{link}` を置換）で調整可能。

## 補足
- noteは公式投稿APIが無いため、RSS監視方式で実現している。
- 新着がRSSに反映されるまで数分かかることがある。すぐ出ない場合は時間を置いて再実行。
- 失敗が続く場合は `DELEGATION.md` に従って委譲を検討（コワーク→Codex→Yoom→Chrome版Claude）。
