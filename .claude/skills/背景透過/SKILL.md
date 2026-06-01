---
name: 背景透過
description: 01_投稿待ちフォルダの商品写真をAIでローカル背景透過し、台帳を更新する。APIキー不要・無料。引数でファイルパスを指定するか、省略すると台帳の未処理行を一括処理。
---

# /背景透過

商品写真の背景を AI（@imgly/background-removal-node）でローカル処理して透過する。
APIキー不要・完全無料・GitHub Actionsで1時間ごとに自動実行される。

引数 `$ARGUMENTS` でローカルファイルパスを指定できる（省略時は台帳一括モード）。

## 手順

### A. ファイル指定モード（引数あり）
```bash
cd ai-sns-automation && node scripts/bg_remove.mjs /path/to/image.jpg
```

### B. 台帳一括モード（引数なし・通常はGitHub Actionsが自動実行）

1. 台帳から「ステータス=未確認 かつ 背景透過画像URL が空」の行を取得
2. 各行の元画像URLからfileIdを抽出
3. GAS経由でダウンロード → ローカルAIで背景透過
4. GAS経由で `02_背景透過済み` フォルダへアップロード
5. 台帳の `背景透過画像URL` を更新

```bash
cd ai-sns-automation && node scripts/batch_bg_remove.mjs --dry-run  # 確認
cd ai-sns-automation && node scripts/batch_bg_remove.mjs             # 実行
```

## 必要な準備（一度だけ）

- Google Sheets「投稿管理」に `背景透過画像URL` 列を追加
- Google Drive に `02_背景透過済み` フォルダを作成
- GitHub Secrets に `GAS_WEBAPP_URL` `GAS_SHARED_TOKEN` `DRIVE_NOBG_FOLDER_ID` を登録
