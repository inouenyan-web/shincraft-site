# Codex作業指示書：Yoomフロー実装補助

## 目的

Yoomで作成するSNS自動投稿フローを、できるだけユーザーが迷わず設定できるように、具体的な設定値・画面操作手順・中継処理を整備する。

重要：CodexはYoomの管理画面を直接操作しない。Codexは、Yoomで設定すべき内容をファイル化し、必要に応じてGoogle Apps Script等の中継処理を作る。

## 現在の構成

### Google Sheets 管理台帳

- ファイル名: SNS投稿管理台帳_Shincraft
- URL: https://docs.google.com/spreadsheets/d/1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s/edit
- Spreadsheet ID: 1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s
- メインシート: 投稿管理

### Google Drive フォルダ

- 親フォルダ: ShinCRAFT_SNS自動投稿
- 親フォルダID: 12yPWPpTztPtRQmlPoehCJNi-NUM0Njkv
- 親フォルダURL: https://drive.google.com/drive/folders/12yPWPpTztPtRQmlPoehCJNi-NUM0Njkv

#### 01_投稿待ち

- 用途: ユーザーが写真を投入するフォルダ。Yoomの最初の監視対象。
- フォルダID: 17BVeGqN2A7Kj_ppMxGXz-Nejim7UQj0j
- フォルダURL: https://drive.google.com/drive/folders/17BVeGqN2A7Kj_ppMxGXz-Nejim7UQj0j

#### 02_画像生成用元写真

- 用途: 処理用コピー保存先。
- フォルダID: 10dAXCJSiGjWk6CQcjGXEgruAfQZ4dXjo
- フォルダURL: https://drive.google.com/drive/folders/10dAXCJSiGjWk6CQcjGXEgruAfQZ4dXjo

#### 03_生成画像

- 用途: ChatGPT/OpenAIで生成した投稿画像の保存先。
- フォルダID: 1eVUuN8qYuHp7h0h_I13nNS6TwuiHRcT7
- フォルダURL: https://drive.google.com/drive/folders/1eVUuN8qYuHp7h0h_I13nNS6TwuiHRcT7

#### 04_承認待ち

- 用途: 投稿前確認用素材。
- フォルダID: 1kzqhA3elg7gwzsyAINm3DHdF6AdBAoOA
- フォルダURL: https://drive.google.com/drive/folders/1kzqhA3elg7gwzsyAINm3DHdF6AdBAoOA

#### 05_投稿済み

- 用途: 投稿済み素材の保管。
- フォルダID: 10b7YcJykmsPm9BcQEP-pUM2ZMvYNLu3i
- フォルダURL: https://drive.google.com/drive/folders/10b7YcJykmsPm9BcQEP-pUM2ZMvYNLu3i

#### 06_エラー確認

- 用途: 失敗・要確認データの隔離。
- フォルダID: 12-Wgy-eD0hOaEd8-9Ftk1cg7AjH7b2RS
- フォルダURL: https://drive.google.com/drive/folders/12-Wgy-eD0hOaEd8-9Ftk1cg7AjH7b2RS

#### 99_テンプレート

- 用途: 投稿ルール・プロンプト保管。
- フォルダID: 1Om0n5Jb50XwKdL-_lBeVdhYKLdzz4KgA
- フォルダURL: https://drive.google.com/drive/folders/1Om0n5Jb50XwKdL-_lBeVdhYKLdzz4KgA

---

## まず作るYoomフロー

### フロー名

ShinCRAFT｜01_画像受付→投稿管理登録

### 目的

Google Driveの `01_投稿待ち` に画像が追加されたら、Google Sheetsの `投稿管理` に1行追加する。

### トリガー

- アプリ: Google Drive
- トリガー: 特定のフォルダ内に新しくファイル・フォルダが作成されたら
- 対象フォルダID: 17BVeGqN2A7Kj_ppMxGXz-Nejim7UQj0j

### アクション1：Google Sheetsに行を追加

- アプリ: Google Sheets
- 操作: レコードを追加 / 行を追加
- スプレッドシートID: 1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s
- シート名: 投稿管理

### 追加する列マッピング

| 列名 | 値 |
|---|---|
| 管理ID | SNS-{{実行日時}} |
| 登録日 | {{現在日時}} |
| 商品名 | {{Google Driveのファイル名}} |
| 投稿カテゴリ | 商品紹介 |
| 元画像URL | {{Google DriveのファイルURL}} |
| 生成画像URL | 空欄 |
| Instagram本文 | 空欄 |
| X本文 | 空欄 |
| CTA | 空欄 |
| ハッシュタグ | 空欄 |
| 補足メモ | 空欄 |
| ステータス | 未確認 |
| 投稿予定日 | 空欄 |
| Buffer登録結果 | 空欄 |
| Instagram投稿URL | 空欄 |
| X投稿URL | 空欄 |
| エラー内容 | 空欄 |

---

## Codexに作ってほしい成果物

### 1. Yoom設定マニュアル

以下のファイルを作成する。

- `ai-sns-automation/YOOOM_STEP_BY_STEP_SETUP.md`

内容：

- Yoomログイン後の操作手順
- Google Drive連携の設定手順
- Google Sheets連携の設定手順
- 上記IDを使った具体的な入力値
- テスト方法
- 失敗時の確認ポイント

### 2. Yoomテスト用のGoogle Sheetsサンプル行

以下のファイルを作成する。

- `ai-sns-automation/yoom_test_sample.md`

内容：

- `01_投稿待ち` に画像を1枚入れた時に、投稿管理シートへ入るべき値の例
- 成功判定
- 失敗判定

### 3. 次段階フローの設計

以下のファイルを作成する。

- `ai-sns-automation/YOOOM_NEXT_FLOW_PLAN.md`

内容：

1. 画像受付→Sheets登録
2. OpenAI画像生成
3. OpenAI投稿文生成
4. 生成結果をSheetsへ戻す
5. ステータスが承認になったらBufferへ投稿予約
6. 成功/失敗をSheetsへ反映

### 4. 可能ならApps Script中継案

Yoom側で処理が複雑になる場合に備えて、Google Apps Script Webアプリを中継として使う案を設計する。

- `ai-sns-automation/GAS_WEBHOOK_BRIDGE_SPEC.md`

内容：

- YoomからWebhookでApps Scriptへ送る値
- Apps Script側でSheetsへ書き込む処理
- エラー時の戻り値
- OpenAI / Buffer連携を後で追加できる拡張設計

## 注意

- 実APIキーやOAuthトークンは書かない
- Yoomの認証情報はGitHubに保存しない
- ユーザーの作業を増やさない
- まずはDrive→Sheets登録だけを確実に動かす
