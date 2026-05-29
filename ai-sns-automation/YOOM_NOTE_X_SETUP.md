# Yoomフロー設定手順：note記事 → X投稿（@honeo_honeo）

## 概要

YoomからGAS（Google Apps Script）Webhookを呼び出してXへ投稿する。
GASはGoogleのサーバーで動くため、Claude Codeのネットワーク制限を受けない。

**フロー:** Yoom手動トリガー → GAS Webhook → X API（OAuth 1.0a）→ X投稿

---

## ステップ1：GASにX APIキーを登録する

1. [apps.google.com/appscript](https://script.google.com) を開く
2. `ShinCRAFT SNS自動投稿` プロジェクトを開く
3. **プロジェクトの設定 > スクリプトプロパティ** に以下を追加：

| プロパティ名 | 値 |
|---|---|
| `X_API_KEY` | X Developer PortalのAPI Key |
| `X_API_SECRET` | API Key Secret |
| `X_ACCESS_TOKEN` | @honeo_honeo のAccess Token |
| `X_ACCESS_SECRET` | Access Token Secret |

> X Developer Portal: https://developer.x.com/en/portal/dashboard
> アプリの権限を **Read and Write** にすること。

4. **デプロイを管理 > 既存デプロイを編集** してコードを更新（URLは変わらない）

---

## ステップ2：Yoomフローを作成する

### フロー名
`note記事→X投稿（手動）`

### トリガー設定
- トリガー：**手動トリガー**（または「フォームトリガー」）
- 入力項目：
  - `noteUrl`（テキスト）：投稿するnote記事のURL
  - `noteTitle`（テキスト）：記事タイトル（省略可）

### アクション設定
- アクション：**HTTP リクエスト**（Webhook送信）
- URL：`[GAS_WEBAPP_URL]`（`GAS_WEBAPP_URL` 環境変数の値）
- メソッド：`POST`
- ヘッダー：`Content-Type: application/json`
- ボディ（JSON）：
  ```json
  {
    "token": "[GAS_SHARED_TOKEN]",
    "action": "note_to_x",
    "noteUrl": "{{noteUrl}}",
    "noteTitle": "{{noteTitle}}"
  }
  ```
  ※ `{{noteUrl}}` と `{{noteTitle}}` はYoomのフォーム入力値から差し込む

---

## ステップ3：記事#11を投稿する

1. Yoomで `note記事→X投稿（手動）` フローを開く
2. 手動トリガーを起動
3. 以下を入力：
   - `noteUrl`：`https://note.com/oshin_2026/n/[記事#11のID]`
   - `noteTitle`：記事#11のタイトル
4. 実行 → X（@honeo_honeo）に投稿される

### 投稿文の形式（自動生成）
```
noteに新しい記事を投稿しました📝
[記事タイトル]
https://note.com/oshin_2026/n/[記事ID]
```

---

## ステップ4：#12〜#15も連続シェア

手順3を繰り返す（各記事のURLとタイトルを入力して実行）。

重複防止機能付き：同じURLは2回投稿されない（`note連携` シートで管理）。

---

## 成功確認

- Yoomのフロー実行ログに `"ok": true` が返ること
- `https://x.com/honeo_honeo` で投稿が確認できること
- `SNS投稿管理台帳_Shincraft` の `note連携` シートに記録が追加されること

---

## エラー時の確認ポイント

| エラー | 確認先 |
|---|---|
| `X APIキーがスクリプトプロパティに未設定` | GASのスクリプトプロパティを確認 |
| `X API エラー 401` | X API KeyとAccess Tokenの組み合わせを確認 |
| `X API エラー 403` | アプリの権限が Read and Write になっているか確認 |
| `認証に失敗しました` | YoomのボディのtokenとGASのSHARED_TOKENが一致しているか確認 |
| `既にX投稿済みです` | note連携シートを確認（重複投稿防止が働いている） |

---

## 参照

- GAS実装：`ai-sns-automation/apps-script/Code.gs`（`note_to_x` アクション）
- 環境変数一覧：`ai-sns-automation/SETUP_SECRETS.md`
- 委譲ポリシー：`ai-sns-automation/DELEGATION.md`
