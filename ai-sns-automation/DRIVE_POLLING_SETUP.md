# Apps Script定期巡回セットアップ手順

この手順は、YoomやWebhookを使わず、Google Apps Scriptだけで `01_投稿待ち` フォルダを定期巡回するためのものです。

## 1. Apps Scriptへ貼り付ける

1. [https://script.google.com](https://script.google.com) を開く
2. ShinCRAFT用のApps Scriptプロジェクトを開く
3. 左側の「ファイル」から新しいスクリプトファイルを作成する
4. ファイル名を `drive_polling` にする
5. このリポジトリの `ai-sns-automation/drive_polling.gs` の内容を貼り付ける
6. 保存する

## 2. 初回権限許可

1. 関数選択で `pollPendingDriveImages` を選ぶ
2. 実行ボタンを押す
3. 初回だけ権限確認が出るため、利用するGoogleアカウントで許可する
4. DriveとSheetsへのアクセス権を許可する

この処理ではAPIキーやGoogle Cloud設定は使いません。

## 3. 時間主導トリガーを作成する

1. 関数選択で `setupDrivePollingTrigger` を選ぶ
2. 実行する
3. Apps Script左側の「トリガー」で、`pollPendingDriveImages` が5分ごとに実行される設定になっていることを確認する

既存トリガーを作り直したい場合は、先に `deleteDrivePollingTriggers` を実行してください。

## 4. テスト方法

1. Google Driveの `01_投稿待ち` に画像ファイルを1枚入れる
2. Apps Scriptで `pollPendingDriveImages` を手動実行する
3. Google Sheets `SNS投稿管理台帳_Shincraft` の `投稿管理` を開く
4. 画像ファイル名が `商品名` に入り、`ステータス` が `未確認` になっていることを確認する
5. 画像ファイルが `05_投稿済み` に移動していることを確認する

## 5. 失敗時の確認ポイント

- `投稿管理` シートに必要な列が存在するか
  - `管理ID`
  - `登録日`
  - `商品名`
  - `投稿カテゴリ`
  - `元画像URL`
  - `ステータス`
  - `エラー内容`
- Apps Scriptの実行ユーザーが対象DriveフォルダとSheetsにアクセスできるか
- `01_投稿待ち` に入れたファイルのMIMEタイプが画像か
- エラーになったファイルが `06_エラー確認` に移動していないか
- Apps Scriptの「実行数」画面でエラーログを確認する
- `setupDrivePollingTrigger` が実行完了なのにトリガー画面で見えない場合は、`listDrivePollingTriggers` を実行してログに出るトリガー数を確認する
- `listDrivePollingTriggers` でも `0` の場合は、同じApps Scriptプロジェクトを開いているか、実行アカウントがトリガー作成を許可されているか確認する

## 6. 固定ID

- Spreadsheet ID: `1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s`
- シート名: `投稿管理`
- 監視フォルダID (`01_投稿待ち`): `17BVeGqN2A7Kj_ppMxGXz-Nejim7UQj0j`
- 処理済みフォルダID (`05_投稿済み`): `10b7YcJykmsPm9BcQEP-pUM2ZMvYNLu3i`
- エラー確認フォルダID (`06_エラー確認`): `12-Wgy-eD0hOaEd8-9Ftk1cg7AjH7b2RS`
