# ShinCRAFT SNS自動投稿 初期構築パッケージ

このフォルダは、Google Driveの `AI` フォルダ配下に、ShinCRAFTのSNS自動投稿運用に必要なフォルダ構成とGoogle Sheets管理台帳を作るための初期構築パッケージです。

## 目的

Google Driveに写真を入れたら、ChatGPTでInstagram投稿用画像と投稿文を作成し、Google Sheetsで承認後、BufferからInstagram / Xに投稿予約する運用を作る。

## 使用ツール

- Google Drive
- Google Sheets
- Google Apps Script
- Yoom
- ChatGPT / OpenAI API
- Buffer
- Codex
- Claude

## 前提

- n8nは使わない
- Google Driveの親フォルダは `AI`
- AIフォルダID: `1Nl5ksVJuwEuDZgyb0jr9V6Os9YLzGBcj`
- 日常運用はAndroid / iPadで行う
- ユーザーの作業は「写真投入」と「承認」だけにする

## 作成される構成

```text
AI
└ ShinCRAFT_SNS自動投稿
   ├ 01_投稿待ち
   ├ 02_画像生成用元写真
   ├ 03_生成画像
   ├ 04_承認待ち
   ├ 05_投稿済み
   ├ 06_エラー確認
   └ 99_テンプレート
```

## 作成されるGoogle Sheets

`SNS投稿管理台帳_Shincraft`

### メイン列

- 管理ID
- 登録日
- 商品名
- 投稿カテゴリ
- 元画像URL
- 生成画像URL
- Instagram本文
- X本文
- CTA
- ハッシュタグ
- 補足メモ
- ステータス
- 投稿予定日
- Buffer登録結果
- Instagram投稿URL
- X投稿URL
- エラー内容

### ステータス

- 未確認
- 修正
- 承認
- 投稿予約済み
- 投稿済み
- エラー

## 初回実行手順

1. Google Apps Scriptを開く
2. `setup.gs` の中身を貼り付ける
3. `setupShinCraftSnsAutomation` を実行
4. Google Drive / Google Sheetsの権限を許可
5. ログに表示された親フォルダURLと管理台帳URLを確認

## 注意

APIキー、Bufferトークン、OpenAIキーなどの秘密情報はGitHubに保存しないこと。
