# 朝6時 全AI報告会（2026/6/29 自動開催）

> **参加者：コード（Claude Code各セッション）／チャット（Chrome版Claude）／コワーク／ChatGPT**
> 各AIは作業開始前にこの報告会資料を必ず読み、以下を自分の頭に同期すること：
> ① いま誰が何を担当しているか（下記・運用ボード）
> ② 井上さんからどんな指摘を受けたか（下記・LESSONS）
> ③ 井上さんの考え＝確立された行動原則（LESSONSの行動原則。違反したまま作業を始めない）
>
> **井上さんに同じ説明を二度させないことが、この報告会の存在理由である。**

---

## 第1部：井上さんからの指摘と行動原則（全員共通の学習）

# LESSONS.md — 井上さんからの指摘・学習ログ（全AI共有・恒久）

> **このファイルは全AI（Claude Code全セッション・Chrome版Claude・コワーク・ChatGPT等）の共有学習記録。**
> 毎朝6時にDriveの共有ブリーフィングへ自動転送される（daily-briefing.yml）。
> 新しい指摘を受けたセッションは、**その場でこのファイルに追記してpushする**こと。

---

## 🔴 行動原則（指摘から確立されたルール）

| # | 指摘日 | 指摘内容 | 確立されたルール |
|---|---|---|---|
| 1 | 2026-06上旬 | 「この一週間、何回同じ事させるねん」 | 同じ手作業を井上さんに二度依頼しない。1回で通らなければ即別アプローチ |
| 2 | 2026-06上旬 | 「私がペーストする直前までchrome版で操作しろと言ってたやろ」 | 値の入力・画面遷移は自動化側が「確定の直前まで」実施。井上さんは最終確定のみ |
| 3 | 2026-06-07 | 「それをchromeにやらせろと何回いわせるねん」 | 取得・登録作業はまず委譲先に振る設計を組んでから井上さんに渡す |
| 4 | 2026-06-08 | 「エージェント分けて部署分けした意味わかってる？全員で検討しろ」 | **毎回全員会議**：タスクごとにAgent並行起動で「誰が・どこを・どれだけ介入するか」を統合検討。ピラミッド式単独判断の禁止 |
| 5 | 2026-06-08 | 「担当外で余ってる人材は忙しい箇所の補助に自動で回れ。ヒマを持て余すな」 | **遊休ゼロ**：人間待ち・外部待ちでブロック中は、余った稼働を他の優先タスクに自動投入 |
| 6 | 2026-06-08 | 「使える機能があるのに私にムリとすぐ言うな。何のためのコネクタ？」 | **「できない」と言う前にコネクタ・MCP・プラグインを全部棚卸しして実測検証する**。Square MCPが接続済みなのに見落としていた実例あり |
| 7 | 2026-06-08 | 「私の作業を常に極限まで減らせ。話を記録してないのか」 | 指摘は全部このファイルに記録。各AIがセッション開始時に読む |
| 8 | 2026-06-08 | 「毎日6時に各AIで指摘を共有して学習しろ。足並みを揃えろ」 | 毎朝6時に本ファイル＋運用ボードをDriveへ自動転送し、全AIが参照する |
| 9 | 2026-06-16 | 「私がクロードコードに出す指示は軽いものではない。常に全員会議の原則で動け」 | **井上さんからの指示は例外なく全員会議を起点にする**。原則#4の徹底版。指示を受けたら、即答せず、まず Agent ツールで検討チーム（調査・代替設計・検証等）を並行起動して「誰が・どこを・どれだけ介入するのが最適か」を統合してから動く。「軽い指示」という自己判断での省略を禁止する。例外は、純粋な事実確認1問への即答のみ（例：「LINEは無料？」）。判断・設計・委譲・実装を伴うものは必ず全員会議 |

## 🔧 技術的な教訓（失敗から学んだこと）

| 日付 | 教訓 |
|---|---|
| 06-04 | bashのパイプは最後のコマンドの終了コードを返す → CIでは `set -o pipefail` 必須（偽成功バグの原因だった） |
| 06-07 | Meta短期トークンは約1時間で失効する。長期化せず登録しても無意味 |
| 06-08 | onnxruntime-nodeのCUDAダウンロードがCIで504になる → `npm install --onnxruntime-node-install-cuda=skip` |
| 06-08 | GITHUB_TOKENにはsecretsスコープが存在しない。Secret書換はPATかGitHub App必須 |
| 06-08 | トークン・シークレットの値をチャットに貼らない（分類器が遮断する＋露出扱いになる） |
| 06-08 | Meta Business Managerのシステムユーザートークンは無期限 → 60日更新の仕組み自体を不要にできる |
| 06-08 | **Square MCPコネクタがセッションに接続済み**（merchant=井上商店・ACTIVE実測確認）。Square商品登録は申請・待ち時間ゼロで直接実行できる |
| 06-12 | **Squareに商品マスタ13点が既に存在し、ECサイト https://shincraft.square.site も公開済み**だった（大半が ecom_available=false で非表示なだけ）。新しい商品DBを作る前に既存資産を実測で棚卸しすること。商品一元管理はSquareカタログを正とする設計に確定 |

## 🤝 Claude製品チームの正体と分担（2026-06-12 公式ドキュメントで確定）

**重大な訂正：「コワーク」はChatGPTではなく Anthropic の Claude Cowork（デスクトップアプリ）だった。**
過去の「コワーク却下（秘密がOpenAIに渡るため）」という判断は誤前提に基づくもので無効。
リポジトリ内の誤定義（DELEGATION.md等）は06-12に修正済み。

| 製品 | ブラウザ操作 | コネクタ | スケジュール実行 | 得意分野 |
|---|---|---|---|---|
| **コード**（Claude Code） | ❌（リモート環境） | GitHub・Square・Drive・Gmail・Canva・カレンダー・GAS | ✅ GitHub Actions（24時間・PC不要） | コード・API・自動化基盤 |
| **コワーク**（Claude Cowork） | ✅ Chrome拡張へ委譲（ログイン済みセッション共有） | リモートコネクタを共有 | ✅ 日次/週次（PC起動中のみ） | ローカルファイル・ブラウザ作業・定型業務 |
| **チャット**（claude.ai） | ❌ | リモートコネクタを共有 | ❌ | 相談・確認・承認・文章 |
| **Chrome版**（Claude in Chrome） | ✅（ログイン済みサイトのみ） | — | ✅（PC＋Chrome起動中） | フォーム入力・画面操作 |

- 「コワーク↔Chrome版の連動」は公式仕様（CoworkがWeb作業をChrome拡張へ委譲する）。
- ログイン画面・CAPTCHA・機密値の入力はどの製品でも人間に残る（Anthropicポリシー）。
- 24時間確実に動かしたい定期処理はGitHub Actions（コード担当）に置く。Coworkの定期実行はPC起動中のみ。
- **AI間の連絡手段**：Driveの「AI報告受信箱」（ID: `1alE6ds2j-iGG-n_vG1wslVuZfo19q-z66ibJiLvd2_g`）に各AIが追記し、コードが読む。
- **コワーク・チャットへの自動委譲**：Claude Codeセッション内は Drive MCP `create_file` でAIフォルダにタスクDocを直接作成。スクリプトからは GAS `appendToDoc` 経由で受信箱Docに追記。コワークは起動時に読んで実行 → 結果を書き戻す。詳細: `ai-sns-automation/COWORK_STARTUP_PROMPT.md` / `CHAT_BRIEFING_PROMPT.md`。
- **GAS appendToDoc/readDoc**：Code.gs に追加済み（2026-06-12）。GAS再デプロイ1回で有効化できる。
- **Cowork起動手順_最新 Doc**：Drive AIフォルダ内 ID `1kw3DtfJOaKv2KY-wqqCvdJHc-vUjKtuJ5poxEC14yQw`。コワーク起動時に必ず読む。最新タスクが記載されている。

### 指揮系統・部署構造（コードが陣頭指揮・社内部署＋外部AIすべて傘下）

```
井上さん（承認だけ）
  └─ コード（Claude Code 秘書セッション）＝陣頭指揮。タスク分解と指示書作成まで全部やる
       │
       ├─【社内部署＝専属エージェント（Agentツールで起動・並行稼働）】
       │    ├─ トレンド調査部 …… trend-researcher（Instagramトレンド収集）
       │    ├─ 本文生成部 ………… sns-text-generator（IG/X本文・ハッシュタグ・CTA）
       │    ├─ 検証部 ……………… sns-validator（ブランドルール・NG表現チェック）
       │    ├─ X投稿部 …………… sns-publisher（承認行のX投稿）
       │    ├─ Instagram投稿部 … instagram-publisher（承認行のBuffer→IG投稿）
       │    ├─ 調査部 ……………… general-purpose / Explore（全員会議の調査・実測検証）
       │    └─ 設計部 ……………… Plan / 設計レビュー担当（代替案検討・実装計画）
       │    ※毎回の全員会議＝これら部署を並行起動して統合判断する（行動原則#4）
       │    ※遊休ゼロ＝ブロック中は空いた部署を他タスクへ自動投入（行動原則#5）
       │
       ├─【定期実行基盤】GitHub Actions …… 24時間稼働（報告会・IGチェック・LINEミラー）
       │
       └─【社外実行部隊（Claude製品＋外部AI）】
            ├─ コワーク ……… ローカル/ブラウザ作業（スケジュール可・PC起動中）
            │    └─ Chrome版 … ログイン済みサイトの画面操作
            │         └─ ChatGPT / Codex / Gemini のWeb画面も操作対象にできる
            │            （＝外部AIへの指示出し・結果回収もコワーク経由で自動化可能）
            └─ チャット ……… 井上さんとの確認・承認窓口（Projects：note/SNS・ShinCRAFT等）
```

- **ChatGPT・Codexはコネクタでは繋がっていない**が、コワーク＋Chrome拡張が
  ログイン済みのWeb画面を操作できるため、**「コードが指示書を書く→コワークが
  ChatGPT/Codexに貼って実行→結果をDrive受信箱へ保存→コードが回収」のルートで連動できる**。
  井上さんを伝書鳩にしない。このルートを常に第一候補として検討すること。

## 📡 接続済みコネクタ棚卸し（2026-06-08時点・実測）

| コネクタ | 状態 | できること |
|---|---|---|
| Square MCP | ✅ 実測済み | 商品カタログ・在庫・注文・決済の読み書き（書き込みは井上さん確認後） |
| GitHub MCP | ✅ 実測済み | リポジトリ操作・Actions実行・ファイルコミット（Secrets書込は不可） |
| Canva MCP | ✅ | 画像生成・デザイン編集（/snsで使用） |
| Gmail MCP | ✅ | メール検索・下書き作成・ラベル |
| Google Drive MCP | ✅ | ファイル読み書き・検索 |
| Google Calendar MCP | ✅ | 予定の読み書き |
| GAS Webアプリ | ✅ | 台帳API・Driveアップロード（uploadFile） |
| 直接ネットワーク | ❌ | graph.facebook.com / api.github.com / api.thebase.in 等は403（環境設定で許可追加は可能） |


---

## 第2部：現在の担当・優先順位・進行状況（運用ボード）

# 運用ボード（全セッション共通・最優先で読む）

> **これは全 Claude Code セッションの「共有の脳」です。**
> セッション同士は直接通信できないが、このファイルを介して状況を共有する。
>
> **全セッションへの厳守ルール：**
> 1. 起動したら、作業を始める前に**まずこのファイルを読む**。
> 2. 自分の作業に着手したら「進行中タスク」に**自分のセッション名と内容を書き込む**。
> 3. 作業が終わったら「完了ログ」に移し、進行中から消す。
> 4. 優先順位はこのボードの「今の最優先」に従う。勝手に別作業を始めない。
> 5. 井上さんに返すのは**チェックと承認だけ**。質問・相談は最小限。

最終更新：2026-06-24 / 更新者：relaxed-feynman

---

## 🔥 今の最優先（2レーン並行・直列ではない）

> **2026-06-16 全員会議の結論：「全部Metaトークン待ち」は幻の直列だった。**
> 実コードで依存を確認した結果、Metaトークンが本当に要るのは **③IG毎朝チェックの1つだけ**。
> ②IG→LINEミラーは設計で剥がせる（台帳の承認済みイベント行起点で送ればMeta不要）。
> EC連携フェーズ0・LINE受注ボット・Square EC公開は **最初からMeta無関係**。
> → 下記を **Aレーン（Meta不要・今すぐ並行）** と **Bレーン（Meta必須・待ち）** に分離。Aは止める理由がない。

### 🟢 Aレーン：Metaトークンを待たず今すぐ動かす（遊休ゼロ）

- **A1. EC連携フェーズ0・BASE Developers利用申請**（リードタイム1〜2週間＝最長・最優先で先行）
  - `EC_INTEGRATION_PLAN.md:86-88` が「先行着手してよい」と明記。git履歴に実行痕跡ゼロ＝**実質未着手**だった。
  - 文面はClaude Code生成 → コワーク（Chrome版）が送信直前まで入力 → 井上さんは送信ボタン1つ。
- **A2. Square 13商品の `ecom_available` 公開切替**（MCP接続済み・申請ゼロ・最短EC公開ルート）
  - どの商品を公開するか井上さんの承認1回 → Claude CodeがMCPで即切替。`EC_INTEGRATION_PLAN.md:30-33`。
- **A3. ZenPlus出店申込＋BASE「かんたん海外販売」エントリー**（審査なし5分・初期月額0円）`EC_INTEGRATION_PLAN.md:89`。
- **A4. ②IG→LINEミラーをMeta依存から剥がす改修**：台帳の承認済みイベント行起点でもLINE配信できるようにする。
  - LINE送信側は稼働済み。Meta読み取りは「IG実投稿との二重配信防止」の補助に格下げ。`scripts/mirror_instagram_to_line.mjs`。
- **A5. LINE受注ボットのデプロイ完遂**（本日実装・`LINE_BOT_SETUP.md`）。GASデプロイ＋Webhook設定のみ。コワーク進行中。
- **A6. LINE受注シートに `square_item_id`（任意）列を確保**：将来のSquare連携時の手戻り防止（第2商品台帳の裏口復活を予防）。

### 🟡 Bレーン：Metaトークン必須（ここだけ待つ）

- **B1. Metaトークン取得（システムユーザートークン・無期限）** → コワークに委譲中。完了後に下記が動く。
- **B2. ③Instagram毎朝チェック**：読み取り専用・唯一の本質的Meta依存。B1完了で稼働＋refresh系ワークフロー撤去。

---

### 旧・最優先（履歴として保持）

1. **Metaトークン：方針C（システムユーザートークン・無期限）に変更 — 全エージェント検討の結論（06-08）**
   - Meta Business Manager の**システムユーザートークンは時間失効しない**（Meta公式仕様）。
   - これにより FB_APP_ID / FB_APP_SECRET / GH_PAT は**全部不要**。自動更新ワークフロー（instagram-token-refresh.yml）も撤去予定。
   - 現行コード（instagram_client.mjs 等）は同じEAA形式トークンのため**無修正で動く**。
   - **井上さんの一度きりの作業（Chrome版が確定直前まで案内）：**
     1. business.facebook.com でビジネスポートフォリオ確認＋Metaアプリ（shincraft-check）の紐付け
     2. システムユーザー作成（管理者権限）
     3. アセット割当（FacebookページとIGアカウント）→「トークンを生成」
        スコープ：instagram_basic, instagram_manage_insights, pages_show_list, pages_read_engagement／期限：**失効しない**
     4. 表示されたトークンを GitHub Secrets の `META_ACCESS_TOKEN` に貼って保存（チャットに貼らない）
   - 完了後：秘書セッションが instagram-check.yml を実行して動作確認 → refresh系の撤去。
   - **06-12：コワークへ自動委譲済み**。Drive AIフォルダに「タスク_Metaトークン設定（最優先）」Doc
     （ID: `18GQx6YL3bllEQ_hAnvtQ2HsaXBXb0-W-lkiIlMtaKu4`）を作成。コワークが次回起動時に
     Chrome版と連動して画面操作を実行し、井上さんは権限承認＋最後の保存ボタンだけ。
   - ~~コワーク委譲は却下~~ →**06-12訂正**：却下理由は「コワーク＝ChatGPT」という誤解に基づく誤判断だった。
     コワークの正体は **Anthropic Claude Cowork**（Chrome版と公式連動・コネクタ共有）。詳細はLESSONS.mdの分担表。
     ただしOAuth認可・機密値の入力が人間に残る点は製品を問わず同じで、方針C自体は変わらない。

2. **IG→LINE自動ミラー：実装済み／上記1の完了待ち**
   - 出店・イベント告知をInstagram投稿すると公式LINEへ自動ブロードキャスト（GitHub Actions・30分間隔）。
   - LINEトークンは Claude Code環境変数・GitHub Secrets の両方に登録済み（✅）。
   - キーワード（出店/イベント/マルシェ 等）を含む投稿だけをLINEへ流す（全投稿ではない）。

3. **Instagramチェック（毎朝）**：上記1の完了待ち。
   - 偽成功バグ（pipeがexitコード隠蔽）は **mainでも修正済み**（set -o pipefail・06-07）。今は失敗が赤く表面化する。
   - `IG_USER_ID=17841463083883101` は GitHub Secrets に登録済み。
   - ⚠️ 短期トークンは約1時間で失効する（実証済み・code=190 Session has expired）。必ず上記1で長期化すること。

4. **投稿パイプライン（/sns）**：X・Instagram（Buffer経由）の環境変数が揃えば全自動化。
   - LINE連携は設定済み。未登録：`X_API_KEY/SECRET/ACCESS_TOKEN/ACCESS_SECRET`、`BUFFER_ACCESS_TOKEN`、`BUFFER_INSTAGRAM_PROFILE_ID`。

5. **商品一元管理システム構築 — Squareカタログを商品マスタに確定（詳細：`ai-sns-automation/EC_INTEGRATION_PLAN.md`）**
   - **実測発見（06-12）**：Squareに商品マスタ13点が既に登録済み・ECサイト https://shincraft.square.site も公開済み。
     ただし大半の商品が ecom_available=false（オンライン非表示）。
   - **次の一手（承認待ち）**：既存13商品の ecom_available を有効化すればECサイトに即掲載できる。
     どの商品を公開するか井上さんの承認1回 → Claude CodeがMCPで直接切替。
   - BASE：商品登録API◎（要・開発者申請＝承認1〜2週間）。ZenPlus：出店5分・CSV一括登録○。
   - creema/minne はAPIなし → Squareカタログから登録テキスト自動生成で半自動。
   - 商品データはSquareが正。台帳（Sheets）はSNS投稿管理に専念（二重入力ゼロ）。

---

<!-- IG_DM_REMINDER:START -->
### 📩 2026-06-29 17:13 Instagram DM 手動チェック（自動リマインド）

> InstagramのDMはAPI(Graph API)では取得できないため自動チェック対象外です。
> instagram_manage_messages 権限(Meta App Review)の承認後に自動取得へ切替予定。
> それまでは下記プロンプトをChrome版Claudeに貼り、DMの受注案件を確認してください。

```
@shincraft2023 のInstagramの「DM(ダイレクトメッセージ)」を確認し、受注・見積・在庫・納期に関するやり取りを抽出してください。

【抽出してほしいもの】
- 受注/注文の依頼・確定（商品名・数量・名入れ内容・希望納期）
- 見積・価格の問い合わせ
- 進行中案件の催促・変更・キャンセル
- 未返信で放置されている受注関連DM

各項目を「相手アカウント / 内容要約 / 次にやること(ToDo) / 期限」の形で箇条書きにしてください。
```
<!-- IG_DM_REMINDER:END -->

<!-- GMAIL_INBOX:START -->
### 📧 2026-06-29 17:13 Gmail 新着チェック（自動 / shincraft2023）

直近24h未読 2件 / うち受注関連の可能性 1件

**🧾 受注関連の可能性（要対応・チェックでクローズ）:**
- [ ] "ラクスル" <mag@raksul.com> ｜ ラクスル会員様限定◆のぼり印刷やその他複数商品が今なら50%OFF！
<!-- GMAIL_INBOX:END -->

<!-- CHATWORK_INBOX:START -->
### 💬 2026-06-29 17:13 Chatwork 新着チェック（既読ルームのみ自動）

既読ルーム 0件を走査 / 受注関連の可能性 0件

既読分に受注関連の新着なし。

<!-- CHATWORK_INBOX:END -->

## 🏃 進行中タスク（セッションごと）

| セッション名 | 担当作業 | 状態 | 最終更新 |
|---|---|---|---|
| relaxed-feynman | 社内部署→コワーク/チャット自動委譲機構の実装＋タスクDoc投入（Metaトークン・GAS再デプロイ・BASE/ZenPlus） | コワークの次回起動待ち | 06-12 |
| relaxed-feynman | LINE受注ボット実装＋全員会議で最優先2レーン再編成＋BASE申請文面作成 | A1申請文面=完成（コワーク投入待ち）/A2は井上さん承認待ち | 06-16 |
| relaxed-feynman | **GAS再デプロイ（最重要）**：Code.gs に writeToDoc 追加・.clasp.json 作成済み。clasp OAuth認証が**このコンテナに未届き**（コワークに誤送）。`localhost:8888/?code=...` をこのチャットに貼ってもらえれば即完了 → 毎朝Drive転送・LINE受注ボットデプロイが両方アンブロック | 🔴 clasp認証待ち | 06-24 |
| （各セッションはここに自分を追記する） | | | |

---

## ✅ 完了ログ（直近）

| 日付 | 内容 | セッション |
|---|---|---|
| 06-16 | 全員会議（現状監査班＋代替設計班）：「全部Metaトークン待ち」が幻の直列と判明。最優先をA/B 2レーンに再編成。BASE申請文面（chrome_base_apply_prompt.md）作成 | relaxed-feynman |
| 06-24 | 毎朝6時ブリーフィングのDrive転送追加（daily_briefing.mjs + Code.gs writeToDoc）・.clasp.json作成・コミット済み。GAS再デプロイのみ残。コワーク受信箱にタスクDoc投入済み | relaxed-feynman |
| 06-24 | 運用ボード更新（本日作業を進行中タスクに反映） | relaxed-feynman |
| 06-16 | LINE受注ボット実装（line_juchu_bot.gs・LINE_BOT_SETUP.md）＋全員会議の原則を恒久ルール化（LESSONS #9） | relaxed-feynman |
| 06-12 | 社内部署→コワーク/チャット自動委譲機構を実装（drive_inbox.mjs・COWORK_STARTUP_PROMPT・CHAT_BRIEFING_PROMPT・GAS appendToDoc/readDoc） | relaxed-feynman |
| 06-12 | Drive AIフォルダにコワーク用タスクDoc投入：Metaトークン設定（最優先）・GAS再デプロイ・BASE申請・ZenPlus出店 | relaxed-feynman |
| 06-08 | EC連携全員会議：BASE API・ZenPlus並行調査完了 → EC_INTEGRATION_PLAN.md に実装計画を確定 | relaxed-feynman |
| 06-08 | 全エージェント検討：コワーク委譲却下・システムユーザートークン（無期限）採用を決定 | relaxed-feynman |
| 06-08 | instagram-token-refresh.yml の npm install バグ修正（CUDA skip）・mainへ反映 | relaxed-feynman |
| 06-07 | instagram-check.yml の偽成功バグ修正をmainへ直接反映（set -o pipefail） | relaxed-feynman |
| 06-07 | Metaトークン自動更新(B)採用を決定・運用ボードに初回設定手順を明記 | relaxed-feynman |
| 06-06 | IG→LINE自動ミラー実装（出店/イベント告知をLINE公式へ自動配信・Actions） | relaxed-feynman |
| 06-06 | LINEトークンを環境変数＋GitHub Secretsに登録完了（LINE連携の前提充足） | relaxed-feynman |
| 06-04 | instagram-check.yml 偽成功バグ修正（set -o pipefail）・SETUP_SECRETS.md 登録先明記 | relaxed-feynman |
| 06-03 | Instagramトークン自動更新を実装（月2回・Secret自動書換／npm ci→install統一） | 秘書 |
| 06-03 | Instagramチェックをgithub actions化（毎朝＋手動・ネット制限回避） | 秘書 |
| 06-03 | Instagramチェック自動化を実装（check_instagram.mjs／Graph API・読取専用） | 秘書 |
| 06-03 | 6月の出店告知投稿 完了 | 秘書 |
| 06-03 | 商品写真22枚 背景透過→Drive(02_背景透過済み)アップロード完了 | relaxed-feynman |
| 06-03 | GAS新規デプロイ（Drive操作対応・uploadFile/listFolder等） | relaxed-feynman |
| 06-03 | CLAUDE.md恒久ルール追加：井上さんに頼む範囲を本人のみ操作に限定 | relaxed-feynman |
| 06-03 | Chrome版↔Claude Code橋渡し（連携ブリッジシート）往復テスト成功 | relaxed-feynman |
| 06-03 | 名入れキーホルダー（ニンジャ）投稿済み（手動） | relaxed-feynman |
| 06-01 | 有料記事 paid_01〜04 をmainへマージ（PR#7） | paid-article |
| 06-01 | 背景透過 PhotoRoom→imgly 差し替え（PR#8） | stoic-dirac |
| 06-01 | /sns オーケストレーター化＋Instagram投稿（PR#6） | festive-tesla |
| 06-01 | 委譲ルール統一（PR#9）／Chrome版先回りルール（PR#10） | 秘書 |

---

## 📌 決定事項・固定ルール（変更しない）

- **🔴 全員検討の原則（2026-06-08 井上さん指示・最優先）**：
  タスクごとに、**最初から複数エージェントを並行で立てて「誰が・どこを・どれだけ介入するのが最適か」を全員で検討してから動く**。
  1セッションが単独判断で直列に委譲する（自分→Chrome版→井上さん、のようなピラミッド式）のは禁止。
  - 例：Metaトークン問題は単独判断では「3Secret手動登録」で止まったが、並行検討により「無期限システムユーザートークンで作業ごと消す」という上位解が出た。
  - 実装方法：判断が必要なタスクが来たら Agent ツールで調査・設計レビュー等の検討チームを並行起動し、結果を統合してから方針を決める。
- **大原則**：Claude Code が全部やる。自分で完結できない時は、**最適な手段を自分で選び、その手段へ渡す「指示プロンプト」まで自分で作って井上さんに提示する**。井上さんはコピペ＆承認だけ。手段選びを井上さんに聞かない。
- **アクセス不可URL**（Instagram等）：聞かれる前にChrome版プロンプトを出す。
- **ハッシュタグ上限5個**（2026年Instagram仕様）。
- 詳細ルールは `CLAUDE.md` と `ai-sns-automation/CLAUDE.md` を参照。

### 手段の選び方（Claude Codeが自分で判断して使い分ける）

| 手段 | 得意（これが来たら選ぶ） | 渡し方 |
|---|---|---|
| **Claude Code（自分）** | コード・ファイル・GitHub・API・文章生成。まず全部これで試す | 自分で実行 |
| **コワーク** | AI協働での企画・長文ブレスト・複雑な構成検討 | 指示プロンプトを生成して提示 |
| **Codex** | 既存スクリプトの保守・バグ修正・リファクタ | 指示プロンプトを生成して提示 |
| **GAS（Apps Script）** | Sheets/Drive操作・台帳API・スプレッドシートトリガー・デプロイ | コード＋手順を提示 |
| **Yoom** | 既存の自動トリガー（Drive検知等）の継続・ノーコード連携 | フロー設定手順を提示 |
| **Chrome版Claude** | ログイン必須/画面操作が要るWeb取得（Instagram・SNS管理画面） | 抽出プロンプトを生成して提示 |
| **ChatGPT** | Claude外の壁打ち・汎用文章・別視点が欲しい時 | 貼り付け用プロンプトを提示 |
| **Gemini** | Google系連携・長文/画像理解・最新検索 | 貼り付け用プロンプトを提示 |

- 判断は Claude Code が行う。複数候補がある時は最も手数が少なく確実な手段を1つ選ぶ。
- 選んだら「なぜそれか」を一言添えて、すぐ使える指示プロンプトを出す。

---

## ❓ よく聞かれる質問への答え（毎回聞かない）

- **台帳の場所** → GAS API経由。`ai-sns-automation/scripts/ledger.mjs list` で読める。
- **Drive固定ID** → `ai-sns-automation/CLAUDE.md` に記載。
- **ブランド世界観** → ハンドメイド・名入れ・オーダーメイド。温かみ／会話調／煽りNG。
