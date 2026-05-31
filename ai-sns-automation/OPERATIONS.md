# OPERATIONS.md — Android運用マニュアル（Claude Code中心）

毎日の作業は **スマホで Claude Code に指示するだけ**。井上さんの手作業は「写真投入」と
「承認」だけ。あとは Claude Code が統括して進める。

## 毎日の流れ

1. **写真を撮る → Photoomで背景透過**（スマホ）
   - 撮影した写真を Google ドライブの `AI > ShinCRAFT_photoroom` フォルダに保存。
   - Photoom アプリで背景透過処理を行い、同じ `ShinCRAFT_photoroom` フォルダに保存。
   - ✅ **ここまでで完了。** 5分以内に自動で `01_投稿待ち` へ移動される（トリガーは `/sns` 初回実行時に自動登録）。

2. **Claude Codeに指示**（claude.ai/code をスマホで開く → `shincraft-site`）
   - `/sns` と入力 → 取り込み・画像生成・本文生成まで進む。
3. **確認して承認**（Google Sheets `SNS投稿管理台帳_Shincraft`）
   - 新しい行の「生成画像URL / Instagram本文 / X本文 / ハッシュタグ」を確認。
   - OKなら `ステータス` を `承認` に変更。直したい時は `修正` にして補足メモに指示。
4. **投稿**（再び Claude Code）
   - `/sns publish` → 承認済みがXへ投稿される。結果は台帳に自動記録。

## note → X（記事を書いたら）

- noteに記事を公開したら、Claude Codeで `/note-x` と入力。
- 新着記事がXへリンク付きで投稿される（重複投稿はされない）。

## うまくいかない時

Claude Code がエラーを説明し、`DELEGATION.md` の優先順位で次の手を判断する：
**コワーク → Codex → Yoom → Chrome版Claude**。井上さんは判断を待てばよい。

よくある原因：
- 環境変数（APIキー/URL）未設定 → `SETUP_SECRETS.md` の登録を依頼される
- ネットワーク許可不足 → 許可ホスト追加を案内される
- 台帳の `ステータス=エラー` 行 → 原因が `エラー内容` 列に記録される

## 注意（重要）

- APIキーやログイン情報を、メモ欄・シート・チャットに貼らない。
- スクショ共有時にトークンが映り込まないよう注意。
- Instagramへの自動投稿は当面なし（手動 or Buffer）。X と note→X を中心に運用。
