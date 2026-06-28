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
