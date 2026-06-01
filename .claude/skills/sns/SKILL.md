---
name: sns
description: ShinCRAFTのSNS投稿パイプラインを進める。トレンド収集→写真取り込み→Canvaで画像生成→本文生成→台帳更新、および承認済み行のX・Instagram（Buffer経由）への投稿完了までをClaude Codeが統括実行する。スマホから「/sns」で起動。
---

# /sns — SNS投稿パイプライン オーケストレーター

あなた（Claude Code）は**指揮役**。各フェーズを専門サブエージェントに委任し、
全体の流れを管理する。`ai-sns-automation/CLAUDE.md` のブランドルール・固定ID・
委譲ポリシーに必ず従う。

引数 `$ARGUMENTS` で段階を指定できる（未指定なら状況を見て案内）：
`intake` / `trend` / `generate` / `publish` / `status`

---

## Step 0: まず状態を把握（常に最初に実行）
```bash
cd ai-sns-automation && node scripts/ledger.mjs list
```
台帳が読めない場合は `SETUP_SECRETS.md` の `GAS_WEBAPP_URL` / `GAS_SHARED_TOKEN` を確認。

状態に応じて実行すべきフェーズを判断する：
- 未確認の行がある → intake済み、trend/generateへ
- 承認待ちの行がある → 井上さんへ確認を促す
- 承認済みの行がある → publishを提案する
- 何もない → intakeから開始

---

## Phase 1: intake（取り込み）
- Google Drive MCP で `01_投稿待ち`（ID: `17BVeGqN2A7Kj_ppMxGXz-Nejim7UQj0j`）の新規ファイルを列挙。
- 台帳に未登録のものを `ledger.mjs` / GAS API 経由で追加（`商品名`=ファイル名, `元画像URL`=ファイルURL, `ステータス=未確認`）。
- 追加件数を報告してからPhase 2へ進む。

---

## Phase 2: トレンド調査

### 2-0. キャッシュ確認
```bash
cat ai-sns-automation/data/instagram_trends.json 2>/dev/null | node -e \
  "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
    try{const j=JSON.parse(d);const age=(Date.now()-new Date(j.updated_at))/3600000;
    console.log(age<24?'FRESH':'STALE');}catch{console.log('MISSING');}})"
```

- `FRESH`（24時間以内）→ キャッシュを使ってPhase 3へ進む
- `STALE` / `MISSING` → **`trend-researcher` エージェントを呼び出す**

### 2-1. トレンドブリーフの読み込み
調査完了後またはキャッシュ使用時、`brief` フィールドの内容をPhase 3での生成に使う。

---

## Phase 3: generate（画像生成 → 本文生成 → バリデーション）

### 3-1. 画像生成（このエージェント自身が実行）
Canva MCP で販促画像を生成：
- **Instagram用 1080×1350（4:5）** を優先生成 / X用 1080×1080（1:1）
- トレンドブリーフを参考にスタイルを決定（フラットレイ・テクスチャー背景など）
- 文字は最小限、商品写真を主役、トーン：今風でシンプル・温かみ重視
- `03_生成画像`（ID: `1eVUuN8qYuHp7h0h_I13nNS6TwuiHRcT7`）へ保存し `生成画像URL` を台帳へ記録

### 3-2. 本文生成（サブエージェントに委任）
**`sns-text-generator` エージェントを呼び出す。**
渡す情報：
- 商品名・元画像URL・生成画像URL・対象台帳行ID
- トレンドブリーフ（`brief` の内容）
- 人気ハッシュタグ候補（`hashtags` リスト）

生成物：Instagram本文（500字以内・CTA必須）／X本文（短文）／ハッシュタグ（最大5個）

### 3-3. バリデーション（サブエージェントに委任）
**`sns-validator` エージェントを呼び出す。**
渡す情報：生成されたInstagram本文・X本文・ハッシュタグ

- 判定OK → 台帳の `ステータス` を承認待ち相当に更新、井上さんへ確認依頼を表示
- 判定NG → `sns-text-generator` に差し戻し（修正理由を渡す）、最大2回まで再生成

---

## Phase 4: 承認は人間が行う
井上さんが Sheets で内容確認し `ステータス=承認` に変更する。
このスキルでは変更しない。確認をうながすメッセージだけ表示する。

---

## Phase 5: publish（X投稿 + Instagram投稿）

### 5-1. X投稿（サブエージェントに委任）
**`sns-publisher` エージェントを呼び出す。**

### 5-2. Instagram投稿 Buffer経由（サブエージェントに委任）
**`instagram-publisher` エージェントを呼び出す。**

前提条件：
- `BUFFER_ACCESS_TOKEN` と `BUFFER_INSTAGRAM_PROFILE_ID` が設定済みであること
- 未設定の場合は `SETUP_SECRETS.md` の「Buffer設定」セクションを案内してスキップ

### 5-3. 完了報告
- X投稿とInstagram投稿（Buffer予約）それぞれの成功件数を報告する
- エラーがあれば `06_エラー確認`（ID: `12-Wgy-eD0hOaEd8-9Ftk1cg7AjH7b2RS`）を確認

---

## 処理しきれない時
`DELEGATION.md` の基準に従い、**コワーク → Codex → Yoom → Chrome版Claude** の順で委譲を検討する。
判断と指示はあなたが行い、井上さんの手数を増やさない。
