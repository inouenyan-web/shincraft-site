---
name: photoroom
description: Google Driveの「ShinCRAFT_photoroom」フォルダの画像を、APIキー不要のローカル背景透過(rembg)で透過し、_透過済みサブフォルダにPNG保存する。スマホから「/photoroom」で起動。Claudeがフォルダを見て未処理だけ処理する。
---

# /photoroom — Drive画像の背景透過（鍵不要・Claude実行）

あなた（Claude Code）は `ShinCRAFT_photoroom` フォルダを見て、未処理の画像を
ローカル背景透過（`rembg`、APIキー不要）で透過し、結果を Drive に保存する。
`ai-sns-automation/CLAUDE.md` の原則（秘密情報を保存しない 等）に従う。

## 固定ID

| 項目 | 値 |
|---|---|
| 入力フォルダ `ShinCRAFT_photoroom` | `1vpJbqdCtwvvNIPDO09BAiml7_Q_4qs6c` |
| 出力サブフォルダ名 | `_透過済み`（無ければ作成） |

## 前提（重要）

- これは **Claudeのセッションが動いている間だけ** 動く方式（24時間放置の自動ではない）。
  放置で常時自動にしたい場合は `ai-sns-automation/apps-script/PhotoRoom.gs`（PhotoRoom鍵が必要）を使う。
- Web実行環境は使い捨てのため、`rembg` の導入とモデル取得はセッション毎に1度走る（数十秒）。

## 手順

### 1. 出力フォルダを用意
- Drive MCP `search_files` で `title = '_透過済み' and parentId = '1vpJbqdCtwvvNIPDO09BAiml7_Q_4qs6c'` を検索。
- 無ければ Drive MCP `create_file`（`mimeType = application/vnd.google-apps.folder`, `parentId` を入力フォルダ）で作成し、そのIDを控える。

### 2. 未処理の画像を洗い出す
- 入力フォルダ直下の画像を列挙：
  `search_files` で `parentId = '1vpJbqdCtwvvNIPDO09BAiml7_Q_4qs6c' and mimeType contains 'image/'`。
- 出力フォルダ内の既存ファイル名を `search_files`（`parentId = <出力ID>`）で取得。
- **重複防止**：入力名 `abc.jpg` の出力名は `abc_透過.png`。これが既に出力フォルダにあるものは飛ばす。

### 3. 1枚ずつ透過（未処理のみ）
各対象ファイルについて：
1. Drive MCP `download_file_content`（`fileId`）で base64 を取得。
2. ローカルに保存し、ヘルパーで透過：
   ```bash
   cd ai-sns-automation
   # <B64> はダウンロードした base64、<EXT> は元拡張子(png/jpg等)
   printf '%s' '<B64>' | base64 -d > /tmp/pr_in.<EXT>
   bash scripts/photoroom_remove_bg.sh /tmp/pr_in.<EXT> /tmp/pr_out.png
   base64 -w0 /tmp/pr_out.png   # この出力を次でアップロードに使う
   ```
3. Drive MCP `create_file` で出力フォルダへ保存：
   - `parentId` = 出力フォルダID
   - `title` = `<元の名前>_透過.png`
   - `base64Content` = 手順2で得た base64
   - `contentMimeType` = `image/png`
   - `disableConversionToGoogleType` = true（PNGのまま保存）

### 4. 結果を報告
- 透過した枚数・スキップ（処理済み）枚数・失敗を井上さんに簡潔に伝える。
- 失敗したファイルは理由を添えて挙げる（形式不明・サイズ過大など）。

## 定期チェックにしたいとき
- 「セッションを開いている間だけ」数分おきに自動化したい場合は `/loop` を併用：
  例）`/loop 10m /photoroom`（10分毎にこのスキルを実行）。
- 放置で24時間自動にしたいなら、鍵が要るが PhotoRoom + Apps Script 方式（`PHOTOROOM_SETUP.md`）に切り替える。

## 補足
- 対応形式: PNG / JPEG / WebP / HEIC。出力は常に透過PNG。
- 入力フォルダ直下のみ処理（`_透過済み` 等サブフォルダ内は対象外）。
- 透過品質が物足りない被写体（髪の毛・透明物など）は PhotoRoom 方式の方が綺麗なことがある。
