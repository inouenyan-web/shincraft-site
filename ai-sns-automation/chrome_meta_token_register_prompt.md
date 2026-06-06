# Chrome版へのタスク指示：META_ACCESS_TOKEN 取得＆GitHub Secrets登録

## あなたがやること（保存ボタンを押す直前まで）

ShinCRAFTのInstagramチェック＆LINE自動ミラーに必要な Meta アクセストークンを取得し、
GitHub Secretsの `META_ACCESS_TOKEN` を更新する。

**最後の「保存・更新」ボタンは押さない。** 入力完了状態まで進め、井上さんに「押してください」と伝える。

---

## Step 1：Meta for Developers でトークンを取得する

1. **https://developers.facebook.com/tools/explorer/** を開く
2. 右上のアカウントが ShinCRAFT のビジネスアカウント（または管理者権限のある個人アカウント）になっているか確認する
3. 「Meta App」プルダウンから ShinCRAFT 用アプリを選ぶ（なければ作成：「新しいアプリを作成」→ビジネス用→ShinCRAFT）
4. 「権限を追加」から以下を選択してチェック：
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_read_engagement`（あれば）
5. 「アクセストークンを生成」ボタンを押す → ダイアログで認可する
6. 生成されたトークン（`EAAxxxx...` の形式）をコピーする

### 短期トークン→長期トークンに変換（重要）

7. **https://developers.facebook.com/tools/debug/accesstoken/** を開く
8. 取得したトークンを貼り付け「デバッグ」→有効期限を確認（短期なら次へ）
9. 長期トークンへの変換：以下URLに自分のアプリIDとシークレットとトークンを入れてアクセス：
   ```
   https://graph.facebook.com/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id={APP_ID}
     &client_secret={APP_SECRET}
     &fb_exchange_token={SHORT_LIVED_TOKEN}
   ```
   → レスポンスの `access_token` が長期トークン（60日有効・`EAA`形式）
10. 長期トークンをコピーしておく

---

## Step 2：GitHub Secrets の `META_ACCESS_TOKEN` を更新する

1. **https://github.com/inouenyan-web/shincraft-site/settings/secrets/actions** を開く
2. 「Repository secrets」の一覧から `META_ACCESS_TOKEN` を見つけ、「Update」をクリック
3. 「Value」欄に Step 1 で取得した長期トークン（`EAAxxxx...`）を貼り付ける
4. **「Update secret」ボタンは押さない。** ここで止まる。

---

## Step 3：井上さんへ報告

以下を伝える：

> 「META_ACCESS_TOKEN の更新準備が完了しました。
> GitHub の Secrets 画面で Value 欄に新しいトークンを入力済みです。
> 「Update secret」ボタンを押して保存してください。
> 保存後、Instagramチェック（毎朝）と出店告知→LINE自動ミラーが動き始めます。」

---

## 補足情報

- アプリID・シークレットは Meta for Developers の「アプリ設定 > ベーシック」で確認できる
- 生成したトークンは `EAA` で始まる長い文字列（100文字以上）
- IG_USER_ID は `17841463083883101`（登録済み・変更不要）
- GitHub Secrets 画面の URL：https://github.com/inouenyan-web/shincraft-site/settings/secrets/actions
