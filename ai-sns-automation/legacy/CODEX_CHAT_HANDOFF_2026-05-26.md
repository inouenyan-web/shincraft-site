# Codexチャット同期用サマリー 2026-05-26

## 目的

このファイルは、Codexデスクトップ上の作業内容をブラウザから確認できるようにするための同期用サマリーです。

Codexのチャット本文そのものをクラウド版ChatGPTへ同期する操作は行っていません。代わりに、今回の作業結果と確認先をGitHub上に整理しています。

## 対象リポジトリ

- GitHubリポジトリ: `inouenyan-web/shincraft-site`
- 対象ディレクトリ: `ai-sns-automation/`
- 作業日: `2026-05-25` から `2026-05-26`

## ユーザー依頼

`ai-sns-automation/CODEX_YOOM_IMPLEMENTATION_TASK.md` を確認し、まずは次のYoomフローだけを確実に設定できるようにする。

```text
01_投稿待ちに画像が追加されたら、SNS投稿管理台帳_Shincraft の投稿管理シートへ1行追加する
```

非エンジニアでも迷わないレベルで、以下を具体化する。

- Yoomの画面操作
- 入力値
- Google DriveフォルダID
- Google SheetsスプレッドシートID
- 列マッピング
- テスト方法
- 失敗時の確認ポイント

また、APIキーやOAuthトークンなどの秘密情報はGitHubへ保存しない。

## 参照した元タスクファイル

- `ai-sns-automation/CODEX_YOOM_IMPLEMENTATION_TASK.md`

## 作成したファイル

### 1. Yoom設定手順書

- `ai-sns-automation/YOOOM_STEP_BY_STEP_SETUP.md`

内容:

- Yoomログイン後の操作手順
- Google Drive連携の設定手順
- Google Sheets連携の設定手順
- 実際に入力するフォルダID、スプレッドシートID、シート名
- 列マッピング
- テスト方法
- 失敗時の確認ポイント
- 秘密情報を保存しない運用ルール

### 2. Yoomテスト用サンプル

- `ai-sns-automation/yoom_test_sample.md`

内容:

- `01_投稿待ち` にテスト画像を1枚入れたときの期待値
- 投稿管理シートに追加されるべきサンプル行
- 成功判定
- 失敗判定
- テスト後に削除してよい行の目印

### 3. 次段階フロー設計

- `ai-sns-automation/YOOOM_NEXT_FLOW_PLAN.md`

内容:

1. 画像受付からSheets登録
2. OpenAI画像生成
3. OpenAI投稿文生成
4. 生成結果をSheetsへ戻す
5. 承認後にBufferへ投稿予約
6. 成功/失敗をSheetsへ反映

今回の主対象は1のみ。

### 4. Apps Script中継案

- `ai-sns-automation/GAS_WEBHOOK_BRIDGE_SPEC.md`

内容:

- YoomからApps ScriptへWebhookで送る値
- Apps Script側でSheetsへ書き込む処理案
- 重複チェック案
- エラー時の戻り値
- OpenAI / Buffer連携を後から追加できる拡張設計

## 作成時の確認

- GitHub上に4ファイルを作成済み。
- 作成後、GitHubから読み戻して存在を確認済み。
- ローカルにも同じMarkdownファイルを作成済み。
- APIキー、OAuthトークン、認可コード、Cookieなどの実秘密情報は保存していない。
- Markdown内にある秘密情報関連の記述は「保存しない」という注意書きのみ。

## 主要固定値

| 項目 | 値 |
|---|---|
| 親フォルダ名 | `ShinCRAFT_SNS自動投稿` |
| 親フォルダID | `12yPWPpTztPtRQmlPoehCJNi-NUM0Njkv` |
| 監視フォルダ名 | `01_投稿待ち` |
| 監視フォルダID | `17BVeGqN2A7Kj_ppMxGXz-Nejim7UQj0j` |
| 監視フォルダURL | `https://drive.google.com/drive/folders/17BVeGqN2A7Kj_ppMxGXz-Nejim7UQj0j` |
| スプレッドシート名 | `SNS投稿管理台帳_Shincraft` |
| スプレッドシートID | `1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s` |
| スプレッドシートURL | `https://docs.google.com/spreadsheets/d/1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s/edit` |
| シート名 | `投稿管理` |

## 最初に設定するYoomフロー

- フロー名: `ShinCRAFT｜01_画像受付→投稿管理登録`
- トリガー: Google Drive `01_投稿待ち` にファイル・フォルダが作成されたら
- アクション: Google Sheets `投稿管理` に1行追加
- 初期ステータス: `未確認`

## 補足

Yoomの実画面操作は、`YOOOM_STEP_BY_STEP_SETUP.md` を見ながら進める想定です。

このファイルはチャットの完全な逐語録ではなく、ブラウザで作業内容を確認するための引き継ぎメモです。
