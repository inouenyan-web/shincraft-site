# Current State

Last updated: 2026-06-29

## Priority 1 — Shared AI quality loop
- Create a daily Claude review in GitHub Actions at 01:07 JST.
- Create a daily ChatGPT review at 01:15 JST.
- Both reviews must read the same core files: `CLAUDE.md`, `LESSONS.md`, `AI共有ブリーフィング_最新.md`, `運用ボード.md`, and `AI_HUB/`.
- Claude produces the technical/automation view; ChatGPT produces an independent business, clarity, and consistency view.
- Material findings become GitHub Issues or a review record. No automatic merge or deployment.

## Priority 2 — Keep the knowledge base usable
- Put permanent corrections in `LESSONS.md`.
- Put active work and blockers in `運用ボード.md`.
- Put an approved cross-AI decision in `AI_HUB/DECISIONS.md`.
- Keep `PROJECT_HISTORY.md` short and public-safe.

## Priority 3 — Existing implementation focus
- Continue strengthening the ShinCRAFT SNS automation pipeline under `ai-sns-automation/`.
- Preserve the separation between ShinCRAFT production/SNS work and Boost WORKS operational-improvement work.

## Blockers / human-only items
- Claude's scheduled GitHub Action requires the Claude GitHub App plus the `ANTHROPIC_API_KEY` repository secret.
- Any change to billing, production publishing, customer communication, or external posting remains subject to human approval.
