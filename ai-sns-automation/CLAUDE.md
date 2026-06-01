# CLAUDE.md — ShinCRAFT 運用の司令塔ガイド

このリポジトリは **Claude Code を「井上さんの代わりの統括役」** として運用するための
設定とスクリプト一式です。SNS自動投稿を中心に、日々の作業は **Android スマホから
Claude Code に指示を出すだけ** で回ることを目指します。

---

## 0. 大原則（最優先ルール）

1. **主軸は Claude Code。** まず Claude Code 自身で処理しきることを試みる。
2. Claude Code が **処理しきれない時だけ**、次の優先順位で委譲する：

   | 優先 | 委譲先 | 役割（得意なこと） |
   |---|---|---|
   | 1 | **コワーク** | AI協働（ChatGPTのコラボ機能＋専用協働ツール）。※人間ではない |
   | 2 | **Codex** | コード保守・既存スクリプトの修正 |
   | 3 | **Yoom** | 既存の自動トリガー（Drive検知など）の継続稼働 |
   | 4 | **Chrome版Claude** | 画面操作の補助（APIが無い操作の最終手段） |

3. 委譲は **自動**。処理しきれないと判断したら、委譲先の選択で井上さんに確認せず、
   上の優先順位で自動的に次へ回す。**判断と指示は Claude Code が行う**。
   井上さんへの確認は、SNS投稿前の承認のような意図的な人間ゲートに限る。
4. **秘密情報（APIキー等）は絶対に Git に保存しない。** 環境変数で渡す（`SETUP_SECRETS.md`）。

「Claude Code が処理しきれない」の判断基準は `DELEGATION.md` を参照。

---

## 1. このリポジトリでできること

- **SNS投稿パイプライン**（トレンド収集 → 写真取り込み → 画像生成 → 本文生成 → 承認 → X・Instagram投稿）を Claude Code が実行
- **note → X クロスポスト**（note新着記事をXへリンク付きで自動投稿）
- 上記の状態管理（Google Sheets 台帳）の読み書き

日常のスマホ操作：
- `/sns` … 投稿パイプラインを進める
- `/note-x` … noteの新着をXへ投稿する

---

## 2. SNS投稿パイプライン（Claude Code が実行する手順）

| 段階 | 実行主体 | 内容 |
|---|---|---|
| ①トレンド収集 | Claude Code + WebSearch | Instagramのハンドメイド商品トレンドを調査し `data/instagram_trends.json` へキャッシュ（24h有効） |
| ②取り込み | Claude Code + Drive MCP | `01_投稿待ち` の新規写真を読み、台帳に行追加（`ステータス=未確認`） |
| ③画像生成 | Claude Code + Canva MCP | トレンドを反映した販促画像を生成し `03_生成画像` に保存、`生成画像URL` を台帳へ |
| ④本文生成 | Claude Code | Instagram本文 / X本文 / ハッシュタグ をトレンドを参考に生成し台帳へ（`ステータス=承認待ち`相当） |
| ⑤承認 | **人間（井上さん）** | Sheetsで内容確認し `ステータス=承認` に変更（スマホ可） |
| ⑥X投稿 | Claude Code + X API | `承認` 行をXへ投稿し `X投稿URL`/`ステータス=投稿済み` を台帳へ |
| ⑦Instagram投稿 | Claude Code + Buffer API | `承認` 行をBufferへ送り Instagram に投稿（`Buffer投稿ID`/`ステータス=投稿予約済み`） |

### 実行コマンド（Claude Codeが端末で実行）
```bash
cd ai-sns-automation && npm install                        # 初回のみ（依存導入）
node scripts/ledger.mjs status 承認                        # 台帳の承認行を確認
node scripts/publish_approved.mjs --dry-run               # 承認済みX投稿内容を確認
node scripts/publish_approved.mjs                         # X投稿を実行
node scripts/post_to_buffer.mjs --dry-run                 # 承認済みInstagram投稿内容を確認
node scripts/post_to_buffer.mjs                           # Instagram（Buffer経由）を実行
node scripts/note_to_x.mjs --dry-run                      # note→X 対象確認
node scripts/note_to_x.mjs                                # note→X 実投稿
```

---

## 3. ブランドルール（本文・画像生成の規範）

**本文**
- Instagram本文：日本語のみ／500字以内目安／CTA必須／ハッシュタグ最大5個
- X本文：短文・可読性優先／Instagramへの導線を必要に応じて添える
- CTA：DM相談・注文・プロフィール確認など明確な行動導線

**画像（Canva）**
- Instagram用 1080×1350（4:5）／X用 1080×1080（1:1）
- 文字は最小限。商品写真を主役に。ロゴ・形状を不自然に変形しない
- トーン：今風でシンプル、温かみ・実用性重視

**NG**
- 誇大広告／未確認の価格・在庫断定／商標・著作権侵害の恐れ／不自然な機械文

---

## 4. 固定ID・台帳仕様

| 項目 | 値 |
|---|---|
| スプレッドシートID | `1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s` |
| シート名 | `投稿管理` |
| AI親フォルダID | `1Nl5ksVJuwEuDZgyb0jr9V6Os9YLzGBcj` |
| プロジェクト親フォルダID | `12yPWPpTztPtRQmlPoehCJNi-NUM0Njkv` |
| `01_投稿待ち` | `17BVeGqN2A7Kj_ppMxGXz-Nejim7UQj0j` |
| `03_生成画像` | `1eVUuN8qYuHp7h0h_I13nNS6TwuiHRcT7` |
| `06_エラー確認` | `12-Wgy-eD0hOaEd8-9Ftk1cg7AjH7b2RS` |

**ステータス値**：`未確認` / `修正` / `承認` / `投稿予約済み` / `投稿済み` / `エラー`

台帳の読み書きは Apps Script Web App（JSON API）経由。実装は `apps-script/Code.gs`、
利用クライアントは `scripts/lib/ledger.mjs`。

---

## 5. 秘密情報とネットワーク

- 必要な環境変数とネットワーク許可ホストは `SETUP_SECRETS.md` に集約。
- キー・トークン・WebアプリURLは **環境変数のみ**。コード/シート/Markdownに直書きしない。

---

## 6. 関連ドキュメント

- `ARCHITECTURE.md` … 新旧構成と移行方針
- `DELEGATION.md` … Claude Code を主軸とした委譲ポリシー（コワーク→Codex→Yoom→Chrome）
- `OPERATIONS.md` … Android運用マニュアル
- `SETUP_SECRETS.md` … 環境変数・ネットワーク設定
