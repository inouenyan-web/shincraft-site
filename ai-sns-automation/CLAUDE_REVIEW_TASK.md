# Claudeレビュー指示書：ShinCRAFT SNS自動投稿

## レビュー対象

Google Driveに写真を入れたら、ChatGPTでInstagram投稿画像と投稿文を作成し、Google Sheetsで承認後、BufferからInstagram / Xに投稿する運用設計。

## 前提

- n8nは使わない
- Yoomを自動化の起点にする
- 投稿画像はChatGPTで作る
- Bufferを投稿担当にする
- 日常運用はAndroid / iPad
- ユーザーはサブエージェント管理をしたくない
- ユーザーの作業は写真投入と承認だけにする

## Claudeに見てほしいこと

1. Android / iPad運用で無理がないか
2. Google Sheetsの列設計に抜け漏れがないか
3. ステータス運用がわかりやすいか
4. Instagram投稿画像生成のルールが安定するか
5. 投稿文生成ルールがShinCRAFT向きか
6. Buffer投稿前のチェック項目は十分か
7. エラー時の流れが実務的か
8. 将来、Boost WORKS側にも転用できる構造か

## 出力してほしいもの

- 改善案
- 修正すべき設計上のリスク
- Instagram画像生成プロンプト最終版
- Instagram / X投稿文生成プロンプト最終版
- 投稿前チェックリスト
- エラー時対応フロー
- Android / iPad用の簡易運用マニュアル

## 禁止

- サブエージェントを増やして管理を複雑にしない
- n8n前提にしない
- Canva前提に戻さない
- ユーザーの日常作業を増やさない
