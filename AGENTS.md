# Cross-AI Operating Rules

## Purpose
GitHub is the shared source of truth for ChatGPT, Claude, Codex, and the human owner. Chat messages are working space; confirmed decisions belong here.

## Role split
- Human owner: final decisions, priorities, publication and spending approval.
- ChatGPT: structure, business/design review, task clarification, quality control.
- Claude: architecture, code review, technical risk review, implementation planning.
- Codex: implementation, tests, scripts, repetitive file work, pull-request preparation.

## Shared knowledge locations
- `AI_HUB/PROJECT_HISTORY.md`: durable project history and completed work.
- `AI_HUB/CURRENT_STATE.md`: current priorities, blockers, and next actions.
- `AI_HUB/DECISIONS.md`: approved rules and decisions.
- `AI_HUB/daily-reviews/`: dated review records. One file per day.
- GitHub Issues: work requests and decisions that need discussion.

## Change rules
1. Do not treat an AI suggestion as fact until it is verified or approved.
2. Record material decisions with date, owner, rationale, and impact.
3. Use a branch and pull request for changes to shared rules, automation, or production files.
4. Do not auto-merge, deploy, publish, spend money, or contact customers without explicit human approval.
5. Keep each daily review to: progress, risks, contradictions, and at most three next actions.

## Data handling
- Never store personal/family information, customer data, credentials, API keys, private URLs, or order details in this public repository.
- Store secrets only in GitHub Secrets or the approved private storage location.
- Mark uncertain information as `Unverified` and add a source or verification task.

## Quality gate
Before proposing a change, check: business fit, consistency with `AI_HUB/DECISIONS.md`, security/privacy, implementation feasibility, and rollback path.


## 📥 受信箱4回チェック（0/6/12/18時）の共通認識（2026-06-30 追加）

ShinCRAFTの受注取りこぼし防止のため、1日4回（JST 0/6/12/18時）の受信箱チェックが恒久稼働中。**コワークもクロードコードも、毎セッション開始時に最新結果を必ず読んで認識を揃えること。**

- **最新の受注・要対応は `運用ボード.md` を読む**（全チャネル横断。`- [ ]` が未対応）。
  - `📧 Gmail` / `💬 Chatwork`（既読精査）/ `📩 Instagram投稿` … GitHub Actions `daily-briefing.yml` が0/6/12/18時に自動更新（コード/Actions側の担当）。
  - `IG_DM_MANUAL` セクション … Instagramのお客様DMはAPI不可のため、コワークが Meta Business Suite を目視して受注・要対応を抽出・反映（App Review承認後はActions側 `check_instagram_dm.mjs` に自動化が切替）。
- 恒久ルールは `受信箱チェック_運用ルール.md`、当日サマリは `AI共有ブリーフィング_最新.md` を参照。
- **担当分担**：自動取得可（Gmail/Chatwork/IG投稿）＝Actions（コード側）、API不可のIG DM＝コワークが目視。結果は同じ `運用ボード.md` に集約し、コワーク/コード/ChatGPTで共通認識する。
- 🔴最優先＝「相手の最後の発言が未返信＝対応待ち」。先頭に強調する。
