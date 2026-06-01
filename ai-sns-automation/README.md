# ShinCRAFT SNS自動投稿（Claude Code 中心運用）

**Claude Code が井上さんの代わりに運用を統括します。** 日常はスマホから Claude Code に
指示するだけ。処理しきれない時のみ **コワーク → Codex → Yoom → Chrome版Claude** の順で委譲します。

## まず読む

- `CLAUDE.md` … 運用の中核ルール（パイプライン・固定ID・委譲ポリシー）
- `OPERATIONS.md` … Android運用マニュアル（毎日の流れ）
- `SETUP_SECRETS.md` … 環境変数・ネットワーク設定（最初の準備）
- `ARCHITECTURE.md` … 新旧構成と設計判断
- `DELEGATION.md` … 委譲ポリシーの詳細

## スマホからの操作

| コマンド | 内容 |
|---|---|
| `/sns` | 写真取り込み→画像生成→本文生成→（承認後）X投稿 |
| `/note-x` | noteの新着記事をXへリンク付きで投稿 |

## できること

1. **SNS投稿パイプライン**：写真 → Canvaで画像 → 本文 → 承認 → X投稿（台帳で状態管理）
2. **note → X クロスポスト**：note新着をXへ自動投稿（重複防止つき）
3. **PhotoRoom 背景透過**：Driveの `photoroom` フォルダに画像を置くと自動で背景透過（`PHOTOROOM_SETUP.md`）

日常の手作業は「`01_投稿待ち` に写真を入れる」「Sheetsで `承認` にする」の2つだけ。

## 初回セットアップ

### A. Drive / Sheets の初期構築（既存。1回だけ）
`setup.gs` を Apps Script で実行すると、投稿用フォルダ一式と管理台帳が作られます。
手順詳細はファイル冒頭のコメントと、本READMEの「初期構築の補足」を参照。

### B. 台帳API（Apps Script Web App）
`apps-script/Code.gs` をデプロイし、Claude Code から台帳を読み書きできるようにします。
手順は `SETUP_SECRETS.md` の「Apps Script 台帳API の準備」。

### C. 環境変数の登録
X API・note・台帳APIのキー類を Claude Code Web環境の環境変数に登録します（`SETUP_SECRETS.md`）。

### D. 依存導入と動作確認
```bash
cd ai-sns-automation && npm install
node scripts/ledger.mjs list
node scripts/note_to_x.mjs --dry-run
node scripts/publish_approved.mjs --dry-run
```

## 初期構築の補足（setup.gs）

1. https://script.google.com で新規プロジェクト作成
2. `setup.gs` を貼り付け、関数 `setupShinCraftSnsAutomation` を実行
3. 初回権限を許可（Drive / Sheets）
4. `AI > ShinCRAFT_SNS自動投稿` 配下のフォルダと `SNS投稿管理台帳_Shincraft` が作成される

## 秘密情報の扱い（重要）

OpenAI / Buffer / X / Google などのキー・トークン・WebアプリURLは **絶対にGitに保存しない**。
すべて環境変数（またはApps Scriptのスクリプトプロパティ）で管理します。

## 旧ドキュメントについて

Yoom / Codex / Buffer / OpenAI 関連の旧ドキュメントは、**フォールバック層の参考資料**として
`legacy/` 以下に残しています（廃止ではなく、Claude Codeで処理しきれない時の選択肢）。
位置づけは `DELEGATION.md` を参照。
