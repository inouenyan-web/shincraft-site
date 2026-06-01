# PHOTOROOM_SETUP.md — Drive×PhotoRoom 背景透過 自動化のセットアップ

Google Drive の **「photoroom」フォルダに画像を置くだけ** で、PhotoRoom が自動で背景を
透過し、透過済みPNGを保存します。処理は Google のサーバー上のタイムトリガー（既定5分毎）で
動くため、**PCもClaude Codeも開いていなくて大丈夫**です。

実装: `apps-script/PhotoRoom.gs`

## できること

```
[人] photoroom フォルダへ画像をアップロード（Driveアプリ）
      │ 5分毎の自動トリガー
      ▼
[PhotoRoom] 背景を透過
      ├ 成功 → photoroom/_透過済み に  <名前>_透過.png を保存
      │         元画像は photoroom/_処理済み へ移動（入力フォルダは常に未処理だけ）
      └ 失敗 → 元画像は photoroom/_エラー へ移動（理由は実行ログに記録）
```

## 1. 入力フォルダ「photoroom」を用意

Google Drive で背景透過したい画像を入れる **`photoroom` フォルダ**を作成し、その
**フォルダID**を控えます（フォルダを開いたときのURL末尾
`https://drive.google.com/drive/folders/★ここがID★`）。

> `_透過済み` / `_処理済み` / `_エラー` のサブフォルダは初回実行時に自動で作られます。

## 2. PhotoRoom APIキーを取得

1. PhotoRoom の API ダッシュボード（ https://www.photoroom.com/api ）でアカウント作成。
2. **API Key** を発行。
   - `sandbox_...` キー … 無料テスト用（結果は透かし入り）。まず動作確認に使える。
   - 本番キー … 1枚処理ごとに課金（プラン従量）。動作確認後に切り替える。

## 3. Apps Script に貼り付け

1. https://script.google.com で新規プロジェクトを作成
   （台帳用 `Code.gs` と同じプロジェクトに追加してもよい）。
2. `apps-script/PhotoRoom.gs` の内容をそのまま貼り付け。

## 4. スクリプトプロパティを登録（秘密情報はここに置く）

プロジェクトの **設定（⚙）> スクリプト プロパティ** に登録します。

| プロパティ名 | 必須 | 値 |
|---|---|---|
| `PHOTOROOM_API_KEY` | ✅ | 手順2のAPIキー |
| `PHOTOROOM_FOLDER_ID` | ✅ | 手順1の `photoroom` フォルダID |
| `PHOTOROOM_SIZE` | 任意 | 出力解像度 `full`(既定)/`hd`/`medium`/`preview` |
| `PHOTOROOM_BG_COLOR` | 任意 | 指定すると透過ではなく単色背景に（例 `FFFFFF`）。透過したい場合は登録しない |

> APIキーは **絶対にコードやシート、チャットに直書きしない**。スクリプトプロパティのみ。

## 5. 自動処理を開始

1. 関数の一覧から **`setupPhotoRoomTrigger`** を選んで実行。
2. 初回は権限の確認が出るので許可（Drive と 外部リクエスト UrlFetch）。
3. これで **5分毎の自動透過**が始まります。

### まず1回だけ手で試す
`runPhotoRoomOnce` を実行すると、その場で1回スキャン・透過します。
`photoroom` に画像を1枚入れてから実行 → `_透過済み` にPNGが出れば成功です。
ログは「実行数」メニューや `Logger` で確認できます。

### 止めたいとき
`removePhotoRoomTriggers` を実行するとトリガーが消え、自動処理が止まります。

## 6. よくあるつまずき

| 症状 | 原因 / 対処 |
|---|---|
| `PHOTOROOM_API_KEY が未設定です` | 手順4のスクリプトプロパティ登録漏れ |
| `PhotoRoom APIエラー HTTP 401` | APIキーが無効 / 失効。再発行して登録し直す |
| `PhotoRoom APIエラー HTTP 402` | クレジット不足。プラン確認、または `sandbox_` キーで検証 |
| 透かしが入る | `sandbox_` キーで処理している。本番キーに切り替える |
| 何も処理されない | `photoroom` フォルダ直下に画像があるか／MIMEが画像か確認（サブフォルダ内は対象外） |
| 元画像が `_エラー` に入る | 実行ログに理由が出る。画像形式・サイズ・キーを確認 |

## 7. 補足

- 対応形式: PNG / JPEG / WebP / HEIC（HEIF）。出力は常にPNG。
- 入力フォルダ直下のファイルだけを処理します（`_透過済み` などサブフォルダは走査しません）。
- 同名の出力が既にある場合は二重処理せず、元画像のみ `_処理済み` へ退避します。
- このスクリプトは Google のサーバー上で動くため、Claude Code Web環境のネットワーク許可設定
  （`SETUP_SECRETS.md` 第2節）の影響を受けません。`sdk.photoroom.com` への通信はApps Script側で完結します。
