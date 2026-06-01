---
name: 1日まとめ
description: 今日の運用結果をまとめて明日への引き継ぎを作る。夜の振り返りに使う。
---

# /1日まとめ

今日の運用結果を集約して明日の準備をする。

## 手順

1. `employees/secretary/todos/YYYY-MM-DD.md` から完了タスクと未完了タスクを抽出
2. `employees/research/logs/daily/YYYY-MM-DD.md` を読んで要約
3. `employees/creative/logs/` から今日作成されたファイルの一覧を整理
4. `employees/community/comments/YYYY-MM-DD.md` から今日対応したコメント・DMの件数を集計
5. `employees/marketing/` に今日更新があれば内容を確認
6. 以下のフォーマットで1日まとめを作成し `employees/secretary/reviews/YYYY-MM-DD.md` に保存

## 出力フォーマット

```markdown
# YYYY-MM-DD 1日まとめ

## 完了タスク
- [ チェックあり ] 

## 未完了タスク（明日に持ち越し）
- 

## 各部署の動き
### リサーチ部
### クリエイティブ部
### コミュニティ部
### マーケティング部
### プロダクト部

## 明日の優先事項
1. 
2. 
3. 
```

7. 翌日 `employees/secretary/todos/YYYY+1-MM-DD.md` を作成して未完了タスクを転記
