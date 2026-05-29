---
name: sns
description: ShinCRAFTのSNS投稿パイプラインを進める。01_投稿待ちの写真取り込み→Canvaで画像生成→本文生成→台帳更新、および承認済み行のX投稿までをClaude Codeが統括実行する。スマホから「/sns」で起動。
---

# /sns — SNS投稿パイプライン統括

あなた（Claude Code）は井上さんの代わりにSNS投稿運用を統括する。
`ai-sns-automation/CLAUDE.md` のブランドルール・固定ID・委譲ポリシーに必ず従う。

引数 `$ARGUMENTS` で段階を指定できる（未指定なら状況を見て案内）：
`intake` / `generate` / `publish` / `status`

## 手順

### 1. まず状態を把握
```bash
cd ai-sns-automation && node scripts/ledger.mjs list
```
- 台帳が読めない場合は `SETUP_SECRETS.md` の `GAS_WEBAPP_URL` / `GAS_SHARED_TOKEN` を確認。

### 2. intake（取り込み）
- Google Drive MCP で `01_投稿待ち`（ID: `17BVeGqN2A7Kj_ppMxGXz-Nejim7UQj0j`）の新規ファイルを列挙。
- 台帳（投稿管理）に未登録のものを `ledger.mjs` / GAS API 経由で追加（`商品名`=ファイル名, `元画像URL`=ファイルURL, `ステータス=未確認`）。

### 3. generate（画像＋本文）
- **画像**: Canva MCP で販促画像を生成（Instagram 4:5 / X 1:1、文字最小限、商品主役）。
  `03_生成画像`（ID: `1eVUuN8qYuHp7h0h_I13nNS6TwuiHRcT7`）へ保存し `生成画像URL` を台帳へ。
- **本文**: ブランドルールに沿って Instagram本文 / X本文 / ハッシュタグ / CTA を作成し台帳へ。
- 生成が終わった行は人間の確認待ち（`ステータス` を確認待ち相当へ）。

### 4. 承認は人間が行う
- 井上さんが Sheets で内容確認し `ステータス=承認` に変更する（このスキルでは変更しない）。

### 5. publish（X投稿）
```bash
cd ai-sns-automation && node scripts/publish_approved.mjs --dry-run   # 確認
cd ai-sns-automation && node scripts/publish_approved.mjs             # 実投稿
```
- 結果（`X投稿URL` / `投稿済み` / `エラー`）は台帳に自動書き戻し。
- Instagramへの自動投稿は当面行わない（API要件が重い。手動 or Buffer）。

## 処理しきれない時
`DELEGATION.md` の基準に従い、**コワーク → Codex → Yoom → Chrome版Claude** の順で委譲を検討する。
ただし判断と指示はあなたが行い、井上さんの手数を増やさない。
