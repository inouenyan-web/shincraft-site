# ARCHITECTURE.md — 新構成（Claude Code 中心）

## 方針

**Claude Code を統括役**に据え、SNS運用の処理を可能な限り Claude Code 自身で実行する。
処理しきれない部分のみ `DELEGATION.md` の優先順位（コワーク→Codex→Yoom→Chrome版Claude）で委譲する。
日常操作は **Android スマホから Claude Code に指示するだけ** を目標とする。

## 新パイプライン

```
[人] 写真を 01_投稿待ち へ（Drive, スマホ）
      │
[Claude Code] /sns
  ├ ① Drive MCP で新規写真を取り込み → 台帳に行追加
  ├ ② Canva MCP で販促画像生成 → 03_生成画像 へ保存 → 生成画像URLを台帳へ
  ├ ③ Claude が本文/ハッシュタグ生成 → 台帳へ（承認待ち）
[人] Sheetsで確認し ステータス=承認（スマホ）
[Claude Code] /sns publish
  └ ⑤ X API で投稿 → X投稿URL/投稿済み を台帳へ

[Claude Code] /note-x
  └ note RSS の新着 → X へリンク付き投稿（重複は note連携シートで防止）
```

台帳の読み書きは Apps Script Web App（JSON API, `apps-script/Code.gs`）経由。

## 旧構成との対応

| 機能 | 旧 | 新 |
|---|---|---|
| トリガー | Yoom（Drive検知→Webhook） | Claude Code を起動して `/sns`（Yoomはフォールバック） |
| 台帳書き込み | Apps Script `doPost`（追記のみ） | Apps Script JSON API（list/append/update＋共有トークン） |
| 画像生成 | OpenAI（Yoom実装） | Canva MCP（OpenAIはフォールバック） |
| 本文生成 | OpenAI（Yoom実装） | Claude Code 自身 |
| 投稿 | Buffer | X API 直叩き（Instagram等はBufferをフォールバック） |
| コード保守 | Codex主担当 | Claude Code 主担当（Codexはフォールバック） |
| 画面操作 | Chrome版Claude | 最終手段のみ |

## 設計判断

- **Instagram 自動投稿は当面見送り**。Graph API はビジネスアカウント＋Facebookページ連携＋
  公開画像URL＋アプリ審査が必要で重い。X と note→X を先に確実化する。
- **note は公式投稿APIが無い**ため RSS 監視方式（`note.com/<user>/rss`、guidで重複防止）。
- **Sheets はサービスアカウントを使わず** Apps Script Web App をJSON API化。URLは秘密として扱い、
  共有トークンで保護する。
- **承認は人間が Sheets で実施**（スマホUIとして分かりやすく、誤投稿防止の人間チェックを担保）。

## 実装ファイル

- `scripts/lib/x_client.mjs` … X投稿（twitter-api-v2, OAuth1.0a）
- `scripts/lib/ledger.mjs` … 台帳JSON APIクライアント
- `scripts/lib/env.mjs` … 環境変数の検証
- `scripts/post_to_x.mjs` … 単発X投稿CLI
- `scripts/publish_approved.mjs` … 承認済み→X投稿
- `scripts/note_to_x.mjs` … note→Xクロスポスト
- `apps-script/Code.gs` … 台帳JSON API（GAS）
- `setup.gs` … Drive/Sheets初期構築（既存・継続利用）
