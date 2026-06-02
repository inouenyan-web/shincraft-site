# Chrome版Claude → Claude Code 自動連携（スプシ橋渡し方式）

## 仕組み（あなたのコピペをゼロに近づける）

```
claude.ai(Chrome版) が作業して回答を出す
        ↓
Claude for Chrome 拡張機能 が、その回答を読んで
スプシ「連携ブリッジ」シートに1行追記する  ← ここを拡張機能が自動化（人のコピペ不要）
        ↓
このセッション(Claude Code) が GAS API でシートを監視
        ↓
新着を検知して次の処理（透過・投稿など）を自動実行
```

claude.ai のタブと Google Sheets のタブを両方Chromeで開いておき、
Claude for Chrome 拡張機能に「claude.aiの最新回答を連携ブリッジシートへ転記して」と
一度指示すれば、以降は拡張機能が画面操作で橋渡しする。

---

## 準備：スプシに「連携ブリッジ」シートを追加

スプシ（`投稿管理`と同じブック）に新しいシート「連携ブリッジ」を作り、
1行目に次のヘッダーを入れる：

| id | timestamp | type | payload | status |
|---|---|---|---|---|

- `id` … ユニークな識別子（時刻＋連番など）
- `timestamp` … 書き込み時刻（ISO8601）
- `type` … 種別（例: `gas_url` / `instagram_extract` / `note_result`）
- `payload` … 本体（URL・抽出テキスト・JSONなど）
- `status` … 空 or `未処理`（Claude Codeが処理したら `処理済み` に更新）

---

## Claude for Chrome 拡張機能への指示（コピペ用）

```
あなたはブラウザ上の claude.ai の最新回答を、Google Sheets の「連携ブリッジ」
シートへ転記するアシスタントです。

手順:
1. claude.ai タブを開き、最新のAI回答テキストを取得する
2. Google Sheets（投稿管理ブック）の「連携ブリッジ」シートを開く
3. 最終行の次に1行追加し、次の列に値を入れる:
   - id: 現在時刻のミリ秒（例: 1717300000123）
   - timestamp: ISO8601形式の現在時刻
   - type: 内容の種別（gas_url / instagram_extract / note_result など）
   - payload: claude.aiの回答本体（URLや抽出結果）
   - status: 未処理
4. 保存する

以降、claude.ai に新しい回答が出るたびに、同じ手順で1行追記してください。
```

---

## このセッション（Claude Code）側の監視

```bash
cd ai-sns-automation

# 単発で新着確認
node scripts/sync_bridge.mjs

# 定期ポーリング（30秒ごと）
/loop 30s node scripts/sync_bridge.mjs

# 処理が終わった行を処理済みにする
node scripts/sync_bridge.mjs --mark <id>
```

---

## 残る人間ゲート（正直な制約）

- Chrome拡張は完全自律ではなく、**最初の1回はあなたが「転記して」と指示**する必要がある
- 拡張機能が確認ダイアログを出す場合があり、その時だけ承認が要る
- それでも「claude.aiの結果を毎回手でスプシに貼る」作業は拡張機能が肩代わりする
