---
name: note
description: noteシリーズ（有料記事）の発信レーンを統括する。下書き完了記事のnote投稿準備→X告知→Instagram告知までをワンコマンドで進める。スマホから「/note」で起動。
---

# /note — noteシリーズ 発信レーン統括

`ai-sns-automation/CLAUDE.md` の原則に従い、noteシリーズ全体のステータスを把握して
次のアクションを自律判断・実行する。引数で段階を指定できる（省略時は自動判断）。

引数 `$ARGUMENTS`：`status` / `check` / `post <id>` / `promote <id>` / `draft <id>`

---

## Step 0: 現状把握（毎回最初に実行）

```bash
cd ai-sns-automation && node scripts/note_series.mjs status
```

出力の「▶ 次アクション候補」に従って実行フェーズを判断する。

---

## Phase 1: 下書き → note投稿（人間ゲート）

該当記事: `下書き完了（未投稿）` 状態のもの。

1. 対象ファイルを確認して冒頭を表示する：
   ```bash
   head -60 ai-sns-automation/<file>
   ```
2. **井上さんへ確認を促す**（ここだけ人間ゲート）：
   - 「[id] 『タイトル』の下書きが完了しています。noteエディタに貼り付けて投稿してください。」
   - ファイルパスとnoteエディタURL（`https://note.com/`）を案内する。
   - 投稿後、URLを教えてもらうよう伝える。

3. URLが届いたら即座に登録：
   ```bash
   cd ai-sns-automation && node scripts/note_series.mjs register <id> <URL>
   ```

---

## Phase 2: note投稿済み → X告知

該当: `note_url` あり・`x_posted` が false の記事。

### 2-1. RSSチェックで自動検出（URLが不明な場合）
```bash
cd ai-sns-automation && node scripts/note_series.mjs check
```

### 2-2. X告知を実行
```bash
cd ai-sns-automation && node scripts/note_to_x.mjs --dry-run   # 内容確認
cd ai-sns-automation && node scripts/note_to_x.mjs             # 実行
```
投稿後、台帳の `x_posted` を自動で更新する（`note_to_x.mjs` が `note連携` シートに記録）。

---

## Phase 3: X告知済み → Instagram告知

該当: `x_posted` が true・`instagram_promoted` が false の記事。

### 3-1. 告知文を生成
```bash
cd ai-sns-automation && node scripts/note_series.mjs promote <id>
```

### 3-2. SNSパイプラインへ流す
生成された Instagram 告知文を `/sns` に渡してInstagram投稿パイプラインに乗せる。
または井上さんに文面を提示して承認を取る（承認後に `/sns publish` で投稿）。

### 3-3. 告知済みマーク
```bash
cd ai-sns-automation && node scripts/note_series.mjs mark-promoted <id>
```

---

## Phase 4: 新規ドラフト生成（`/note draft <id>`）

記事IDと対象ファイルを確認し、Claude Code が記事本文を生成・更新する。

1. 現在のドラフトを読む:
   ```bash
   cat ai-sns-automation/<file>
   ```
2. `oshin_2026_paid_plan.md` のガイドに従い、ブランドルール・文体・構成を守って加筆。
3. ファイルを更新して井上さんへ確認を促す。

---

## 処理しきれない時

`ai-sns-automation/DELEGATION.md` の基準に従って委譲（コワーク→Codex→Yoom→Chrome版Claude）。
判断と指示はこのセッションが行い、井上さんの手数を増やさない。

---

## 対象シリーズと記事一覧

| id | シリーズ | タイトル | 状態 |
|---|---|---|---|
| sc-01 | shincraft | AIにSNS運用を丸投げした実体験と手順 | 下書き完了 |
| sc-02 | shincraft | スマホだけでAIに業務を回させる方法 | 下書き完了 |
| sc-03 | shincraft | ハンドメイド作家のSNS集客術 | 下書き完了 |
| sc-04 | shincraft | 病院という閉じた世界の恋愛事情 | 下書き完了 |
| oshin-01 | oshin | 病院の恋愛事情（実話エッセイ） | 下書き完了 |
| oshin-02 | oshin | 病院で働くリアル全部 | 下書き完了 |
| oshin-03 | oshin | 転職の見極めとコツ | 下書き完了 |
| oshin-04 | oshin | 大手のリアル・辞め時・リストラ | 下書き完了 |
