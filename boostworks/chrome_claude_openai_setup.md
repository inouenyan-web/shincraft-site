# Chrome版Claude指示：OpenAI APIキー取得 → Claude Code環境変数登録

## あなたへのお願い

以下の2つの作業を画面を見ながら案内してください。

---

## 作業1：OpenAI APIキーを取得する

1. `https://platform.openai.com/api-keys` を開く
2. ログインしていなければ shincraft2023@gmail.com でログイン
3. 「Create new secret key」ボタンを押す
4. 名前に `shincraft-claudecode` と入力して作成
5. 表示された `sk-...` のキーをコピーして控えておく（この画面を閉じると二度と見れない）

---

## 作業2：Claude Code Webの環境変数に登録する

1. `https://claude.ai/code` を開く
2. 対象の環境（shincraft-site）を開く
3. 環境の「設定」または「Environment variables」を開く
4. 以下を追加する：
   - キー名：`OPENAI_API_KEY`
   - 値：作業1でコピーした `sk-...`
5. 保存する

---

## 作業3：ネットワーク許可の確認

環境のネットワークポリシーに以下が含まれているか確認する：
- `api.openai.com`

含まれていない場合は追加する（環境の再作成が必要な場合あり）。

---

## 完了したら

Claude Codeのチャットに「OpenAI APIキー設定完了」と伝えてください。
以降は「DALL-E 3で画像作って」と言うだけで自動生成できるようになります。
