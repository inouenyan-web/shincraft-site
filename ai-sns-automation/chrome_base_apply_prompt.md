# コワーク/Chrome版へのタスク指示：BASE Developers 利用申請（EC連携フェーズ0・最優先）

## なぜ今やるか

BASEの商品登録APIを使うには developers.thebase.in での利用申請が必要で、**承認に1〜2週間かかる**（`EC_INTEGRATION_PLAN.md:56,87`）。これがEC連携で最長のリードタイム。Metaトークンとは無関係に**今すぐ先行着手**できるので、待ち時間を並行で消化する。

## あなた（コワーク/Chrome版）がやること

**最後の「申請する／送信」ボタンは押さない。** 入力を完了させて、送信直前で止めて井上さんに報告する。

---

## Step 1：BASE Developers にログイン

1. **https://developers.thebase.in/** を開く
2. 右上「ログイン」→ ShinCRAFT（井上商店）の BASE アカウントでログイン
   - BASEショップを持っていない場合は、先に https://thebase.in でショップ開設が必要（その場合は井上さんに確認）

## Step 2：アプリケーションを新規登録

3. メニューから「アプリを作成」または「Developer登録」→ 新規アプリ作成
4. 以下を入力（コピペ可）：

| 項目 | 入力値 |
|---|---|
| アプリ名 | `ShinCRAFT 商品連携` |
| アプリの説明 | 下の「■アプリ説明文」をコピペ |
| リダイレクトURI（Callback URL） | `https://script.google.com/macros/s/＿＿＿/exec`（GAS WebアプリのURL。未確定なら仮で `https://shincraft.square.site/callback` を入れ、後で差し替える旨をメモ） |
| 利用するAPIスコープ | `read_items` / `write_items` / `read_orders`（商品の読み書きと注文取得） |

### ■アプリ説明文（このままコピペ）

```
当アプリは、ハンドメイド雑貨ブランド「ShinCRAFT（井上商店）」の自社商品管理を
自動化するために使用します。Googleスプレッドシートおよび商品マスタ（Square
カタログ）で一元管理している自社商品データを、BASEショップへ自動で登録・更新し、
在庫と公開状態を同期することが目的です。

- 取り扱い商品：名入れネームタグ、オリジナル看板、アクセサリー等の自社ハンドメイド製品
- 利用API：商品の登録・更新（items）、注文情報の取得（orders）
- 対象は自社ショップ1店舗のみ。第三者への販売・データ提供は行いません。
- 商品登録は非公開（visible=0）で行い、運営者が内容確認後に公開します。
```

## Step 3：送信直前で止めて報告

5. 入力内容を確認し、**「申請する」ボタンは押さずに** 止まる
6. 井上さんへ以下を報告：

> 「BASE Developers の利用申請の入力が完了しました。内容を確認のうえ『申請する』ボタンを押してください。承認まで1〜2週間かかります。承認後、商品の自動登録（BASE・越境EC）が動き始めます。
> なお発行される client_id / client_secret は、承認後に GitHub Secrets へ登録します（その手順は別途用意します）。」

---

## 補足（Claude Code向けメモ・申請後の段取り）

- この実行環境から `api.thebase.in` はブロック中（`EC_INTEGRATION_PLAN.md:60,118`）。
  → 実装は **GAS WebアプリまたはGitHub Actions経由**に寄せる。だから Callback URL も GAS WebアプリURLにするのが本筋。
- 承認後の作業：OAuth認可フロー（コールバックはGAS）→ トークン自動リフレッシュ（GitHub Actions・週1）→ `items/add`(visible=0)→井上さん承認→公開。
- client_id / client_secret は**環境変数のみ**。コード・シート・チャットに直書きしない（`SETUP_SECRETS.md`）。
