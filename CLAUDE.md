# CLAUDE.md（リポジトリ全体）

**Claude Code が井上さんの代わりに運用を統括します。** まず Claude Code 自身で処理し、
できない時のみ次の優先順位で委譲してください：**コワーク → Codex → Yoom → Chrome版Claude**。

主な作業は `ai-sns-automation/` に集約しています。運用の中核ルール・パイプライン・
固定ID・委譲ポリシーは **`ai-sns-automation/CLAUDE.md`** を参照してください。

スマホからの定型操作：
- `/sns` … SNS投稿パイプラインを進める
- `/note-x` … noteの新着記事をXへ投稿する
- `/photoroom` … Driveの `ShinCRAFT_photoroom` の画像を背景透過する（鍵不要）

秘密情報（APIキー等）は Git に保存せず、環境変数で渡します
（`ai-sns-automation/SETUP_SECRETS.md`）。
