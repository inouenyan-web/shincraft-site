---
name: 背景透過
description: 01_投稿待ちフォルダの商品写真をPhotoRoom APIで背景透過し、台帳を更新する。引数でファイルパスを指定するか、省略すると台帳の未処理行を一括処理。
---

# /背景透過

商品写真の背景を PhotoRoom API で透過処理する。

引数 `$ARGUMENTS` でローカルファイルパスを指定できる（省略時は台帳一括モード）。

## 手順

### A. ファイル指定モード（引数あり）
```
/背景透過 /path/to/image.jpg
```
1. 指定ファイルに対して背景透過を実行
2. `{元ファイル名}_nobg.png` として同ディレクトリに保存

### B. 台帳一括モード（引数なし）

1. 台帳から「背景透過未処理の行」を取得する
   ```bash
   cd ai-sns-automation && node scripts/photoroom.mjs --ledger
   ```

2. 対象行がある場合、各行の `元画像URL` から Drive MCP で画像をダウンロード

3. 各画像を PhotoRoom API で背景透過処理
   ```bash
   cd ai-sns-automation && node scripts/photoroom.mjs <ダウンロードしたファイルパス>
   ```

4. 処理済みの PNG ファイルを Drive MCP で `02_背景透過済み` フォルダへアップロード

5. アップロード後の URL を台帳の `背景透過画像URL` 列に書き込む
   ```bash
   cd ai-sns-automation && node scripts/ledger.mjs update <管理ID> 背景透過画像URL=<Drive URL>
   ```

6. 全行処理完了後、件数を報告

## エラー時の対処

- `PHOTOROOM_API_KEY` 未設定 → `SETUP_SECRETS.md` を確認
- `sdk.photoroom.com` への通信エラー → 環境のネットワーク許可ホストに追加
- API クレジット不足 → PhotoRoom ダッシュボードで残高確認

## 必要な準備

- `PHOTOROOM_API_KEY` を環境変数に登録（`SETUP_SECRETS.md` 参照）
- Google Drive に `02_背景透過済み` フォルダを作成し、フォルダIDを `ai-sns-automation/CLAUDE.md` に追記
- Google Sheets「投稿管理」シートに `背景透過画像URL` 列を追加
- 環境のネットワーク許可ホストに `sdk.photoroom.com` を追加
