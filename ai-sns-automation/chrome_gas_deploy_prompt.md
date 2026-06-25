# Chrome拡張への指示：GAS Code.gs 更新＆再デプロイ

以下を **Claude for Chrome 拡張機能** にそのまま貼り付けてください。
拡張がブラウザを操作して、Apps Scriptのコード貼り替えとデプロイ更新を行います。

> このプロンプトのゴール：デプロイ済みGASに `listFolder` / `getFileBase64` /
> `uploadFile` / `ensureSheet` / `setupSheet` の各アクションを反映させること。
> これが反映されると、背景透過済み画像22枚のDrive自動アップロードが動きます。

---

## 拡張へのプロンプト（コピペ用）

```
Google Apps Script のコードを最新版に置き換えて再デプロイしてください。

【1. プロジェクトを開く】
- https://script.google.com を開く
- 台帳API用プロジェクト「ShinCRAFT_SNS初期構築」を開く
  （ID: 1J5qydeVJh-8WySS4g_plNP0z2o6dsbCUm9j3hd_jxr_WR2CN2QtBgvML ／ doGet・doPost を含むのがこれ）
  ※「無題のプロジェクト」は放置版なので開かない
- 左の「エディタ」で Code.gs を選択

【2. 最新コードを取得】
- 別タブで下記URL（公開リポジトリの最新版Code.gs・バイト完全一致）を開く:
  https://raw.githubusercontent.com/inouenyan-web/shincraft-site/main/ai-sns-automation/apps-script/Code.gs
  ※まだ main に未反映なら作業ブランチの raw を使う（Claude Code が最新URLを案内する）
- 表示された全文を全選択してコピー（Ctrl+A → Ctrl+C）
  ※ドライブの古いコピー（11_Pj94… 等）は writeToDoc 等が欠落しているため使わない

【3. コードを全置換】
- Apps Scriptエディタに戻り、Code.gs内で全選択（Ctrl+A / Cmd+A）して既存コードを削除
- 手順2でコピーした最新コードを貼り付け
- 保存（Ctrl+S / Cmd+S）
- 貼り付け後、コードの末尾に function json_(obj) があること、
  および listFolder_ / getFileBase64_ / uploadFile_ / writeToDoc_ / appendToDoc_ / readDoc_ の各関数があることを確認

【4. 再デプロイ（URLを変えない方法）】
- 右上「デプロイ」→「デプロイを管理」
- 一覧にある既存のウェブアプリデプロイの「鉛筆（編集）」アイコンをクリック
- 「バージョン」を「新バージョン」に変更
- 「次のユーザーとして実行」=「自分」、「アクセスできるユーザー」=「全員」を確認
- 「デプロイ」をクリック
- ※新規デプロイは作らないこと（URLが変わるため）

【5. 動作確認】
- デプロイ完了後に表示される「ウェブアプリのURL」をブラウザで開く
- {"ok":true,"status":"alive"} と表示されれば成功（doGetが応答している＝最新版）

【6. 結果を報告】
- ウェブアプリのURLと、手順5の表示結果を報告
- もし途中でエラーや権限ダイアログが出たら、その文面を報告
```

---

## なぜDrive経由でコピーさせるのか

最新版Code.gsは約240行と長く、チャット欄への直接貼り付けは拡張の画面操作だと
途中で切れることがあります。Claude Code が **マイドライブに最新版の全文を
テキストファイルとして保存済み**（ID: `11_Pj94ojje1xH9VGMD2WxmMt74hsFnbB`）なので、
そこから正確にコピーさせる方が確実です。

## 注意（正直な制約）

- 貼り付け後、エディタの行数が想定（約240行）と大きくズレていたら貼り直しを指示すること。
- デプロイメニューの操作中に Google の権限確認ダイアログが出たら、拡張は
  そこで止まる。その時は井上さんが1回承認する。
- 完了したら Claude Code に「GAS更新した」と伝える。Claude Code が
  `python3 /tmp/bg_work/upload_all.py`（またはセッション復帰後に再処理）で
  背景透過済み22枚を `02_背景透過済み` フォルダへ自動アップロードする。
