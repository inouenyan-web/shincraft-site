# コワーク/Chrome版へのタスク指示：Meta システムユーザートークン取得＆GitHub Secrets登録

## ⚠️ 重要：旧手順（Graph API Explorer / 60日有効）は使わない

**使用する手順：Meta Business Manager → システムユーザートークン（失効しない・永久有効）**

理由：Graph API Explorerで取得できるユーザートークンは最大60日で失効する。
システムユーザートークンは期限なしのため、更新作業が不要になる。

---

## あなた（コワーク/Chrome版）がやること

**最後の保存ボタンは押さない。** GitHub の「Update secret」ボタンと Meta の最終承認は井上さんが押す。

---

## Step 1：Meta Business Manager でシステムユーザーを作成してトークンを生成

### 1-1. Business Manager にアクセス
1. **https://business.facebook.com** を開く
2. 上部のビジネスポートフォリオ名が ShinCRAFT のものになっているか確認する
   - なっていなければ左上のドロップダウンで切り替える

### 1-2. システムユーザーを作成（まだなければ）
3. 左メニューまたは歯車アイコン → **「ビジネス設定」** を開く
4. 左サイドバー → **「ユーザー」** → **「システムユーザー」** をクリック
5. 「追加」ボタン → システムユーザー名（例：`shincraft-api`）を入力 → ロール：**「管理者」** を選択 → 作成

### 1-3. アセット（ページ・IGアカウント）を割り当てる
6. 作成したシステムユーザーをクリック → **「アセットを割り当てる」** をクリック
7. 「ページ」タブ → ShinCRAFT の Facebook ページを選択 → 権限：**「フルコントロール」** → 変更を保存
8. 「Instagram アカウント」タブ → ShinCRAFT の Instagram アカウントを選択 → 権限：**「フルコントロール」** → 変更を保存

### 1-4. トークンを生成
9. システムユーザーのページに戻り → **「トークンを生成」** をクリック
10. 「アプリを選択」：**shincraft-check**（または ShinCRAFT に紐付けたアプリ）を選ぶ
11. 「トークンの有効期限」：**「失効しない」** を選択
12. 「権限」から以下をチェック（すべて必須）：
    - `instagram_basic`
    - `instagram_manage_insights`
    - `pages_show_list`
    - `pages_read_engagement`
13. **「トークンを生成」** ボタンをクリック → Meta の認証ダイアログが出たら **井上さんに承認してもらう**
14. 表示されたトークン（`EAAxxxx...` の形式）を**画面内でそのままコピー**（チャット・Docには貼らない）

---

## Step 2：GitHub Secrets の `META_ACCESS_TOKEN` を更新する

15. **https://github.com/inouenyan-web/shincraft-site/settings/secrets/actions** を開く（新しいタブ）
16. 「Repository secrets」の一覧から `META_ACCESS_TOKEN` を見つけ → **「Update」** をクリック
17. 「Value」欄に Step 1 でコピーしたトークンをペースト
18. **「Update secret」ボタンは押さない。** ここで止まる。

---

## Step 3：井上さんへ報告

以下を伝える：

> 「META_ACCESS_TOKEN の更新準備が完了しました。
> Meta のシステムユーザートークン（永久有効）を生成し、GitHub Secrets の Value 欄に入力済みです。
> 2つの操作をお願いします：
> ① Meta の認証ダイアログが出ていれば「承認」を押してください（出ていなければスキップ）
> ② GitHub Secrets の画面で「Update secret」ボタンを押してください
> 完了後、Instagramチェック（毎朝）と出店告知→LINE自動ミラーが動き始めます。」

---

## 補足情報

- **トークンはチャットやDocには絶対に貼らない**（Meta画面→GitHub画面の直接コピペで完結させる）
- システムユーザートークンは `EAA` で始まる（ユーザートークンと同じ形式だが期限が異なる）
- IG_USER_ID は `17841463083883101`（登録済み・変更不要）
- アプリが見つからない場合：Meta for Developers → アプリ → shincraft-check をビジネスに紐付け
- GitHub Secrets 画面：https://github.com/inouenyan-web/shincraft-site/settings/secrets/actions
