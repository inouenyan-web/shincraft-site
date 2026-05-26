# Yoomを使わない運用方針

ShinCRAFTのSNS投稿準備は、Yoomを使わず、Google Apps Scriptの時間主導トリガーで運用します。

## 方針

- Yoomは使わない
- Google Cloudは使わない
- Webhook URLは使わない
- Google Apps Scriptの時間主導トリガーを使う
- 画像検知とGoogle Sheets登録はApps Scriptに集約する
- 修正や保守はCodexで `drive_polling.gs` を編集して行う
- 本番SNS投稿は、この段階では実行しない

## なぜGoogle Cloudを使わないか

Google CloudやApps Script API連携を前提にすると、追加の認証、権限、課金設定、プロジェクト管理が必要になる可能性があります。

今回の日常運用に必要なのは「Driveフォルダに入った画像をSheetsへ登録すること」だけなので、Apps Scriptの標準機能で完結させます。

## 日常運用手順

1. AndroidやPCからGoogle Driveの `01_投稿待ち` に画像を入れる
2. 最大5〜10分待つ
3. Google Sheets `SNS投稿管理台帳_Shincraft` の `投稿管理` を開く
4. 追加された行を確認する
5. 投稿内容を確認し、問題なければ `ステータス` を `承認` にする

登録直後の値は以下です。

| 列 | 値 |
|---|---|
| 管理ID | `SNS-YYYYMMDD-HHmmss` |
| 登録日 | Apps Script実行日時 |
| 商品名 | Driveファイル名 |
| 投稿カテゴリ | 商品紹介 |
| 元画像URL | DriveファイルURL |
| ステータス | 未確認 |
| エラー内容 | 空欄 |

## ファイルの移動

- 登録成功: `05_投稿済み` へ移動
- 登録失敗: `06_エラー確認` へ移動し、ファイル説明欄にエラー内容を記録

## 二重登録防止

Apps ScriptのScript Propertiesに処理済みファイルIDを保存します。

また、`投稿管理` の `元画像URL` に同じファイルIDが含まれている場合も登録済みとして扱います。

## トラブル時の見る場所

- Apps Scriptの「実行数」画面
- Google Driveの `06_エラー確認`
- Google Sheets `投稿管理` の列名
- Apps Scriptプロジェクトのトリガー設定

YoomやGoogle Cloud側で確認する項目はありません。
