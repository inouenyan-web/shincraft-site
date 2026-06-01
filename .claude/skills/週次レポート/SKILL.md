---
name: 週次レポート
description: 先週の運用結果を集計して週次レポートを作る。毎週月曜朝に実行。
---

# /週次レポート

先週1週間の運用結果を集計して井上さんに報告する。

## 手順

1. 先週（月〜日）の各部署ログを集計：
   - `employees/research/logs/daily/` ：日次バズ投稿レポート7件
   - `employees/research/logs/weekly/` ：週次競合分析レポート
   - `employees/creative/logs/` ：制作コンテンツ一覧
   - `employees/community/comments/` ：コメント・DM対応件数
   - `employees/secretary/reviews/` ：日次まとめ7件
2. 以下の数字をまとめる：
   - 投稿数（フィード投稿・リール・ストーリーズ別）
   - 作成コンテンツ本数
   - コメント送信件数・DM送信件数
   - LINE新規登録数（分かれば）
3. 先週の良かった点・悪かった点を各3つ挙げる
4. 来週の改善案を3つ提示
5. 結果を `employees/secretary/reviews/YYYY-Www.md` に保存

## 出力フォーマット

```markdown
# YYYY-Www（YYYY-MM-DD〜MM-DD）週次レポート

## 今週の数字
| 指標 | 実績 |
|------|------|
| フィード投稿数 |  |
| リール数 |  |
| ストーリーズ数 |  |
| コメント送信数 |  |
| DM送信数 |  |
| LINE新規登録数 |  |

## 良かった点
1. 
2. 
3. 

## 改善すべき点
1. 
2. 
3. 

## 来週の改善案
1. 
2. 
3. 

## 来週のフォーカステーマ
```
