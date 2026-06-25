// ShinCRAFT LINE受注ボット
// =====================================================================
// このスクリプトは既存のCode.gsとは別の、新しいGASプロジェクトとして作成する。
//
// ■ スクリプトプロパティに設定が必要なもの（LINE_BOT_SETUP.md 参照）：
//   LINE_CHANNEL_ACCESS_TOKEN  - LINEチャンネルアクセストークン
//   LINE_CHANNEL_SECRET        - LINEチャンネルシークレット
//   ANTHROPIC_API_KEY          - AnthropicのAPIキー
//
// ■ デプロイ方法：
//   「デプロイ」→「新しいデプロイ」→「ウェブアプリ」
//   実行ユーザー：自分
//   アクセス：全員
//   → 発行されたURLをLINE DevelopersのWebhook URLに設定する
// =====================================================================

const JUCHU_SHEET_ID = '10Ei0mrQS9MCK6p2ty_C0Me4yimc6eLLBOgWqCwIWicw';
// Instagram DM受注見込みはSNS台帳スプレッドシートの「受注見込み」シートに入る
const SNS_SHEET_ID = '1j8R23sZZfF1h7X1X87EyS1f9KxHkYBPr0ZSbRNxK16s';

// Squareカタログの正規商品名（商品マスタはSquareが正・EC_INTEGRATION_PLAN.md）。
// LINE受注の自由文字列をこの正式名称へ正規化し、第2の商品台帳化（表記揺れ）を防ぐ。
const SQUARE_ITEM_NAMES = [
  'ネームタグ大', 'ネームタグ中', 'ネームタグ小', 'ネームタグ星', '桶',
  '多用途スタンド', 'ピアス', 'イヤリング', 'ネックレス', 'ステンレスタグ',
  'イラスト作成代', 'オリジナル看板', '看板セット',
];

// ヘルスチェック用
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, status: 'LINE受注ボット稼働中' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// LINEからのWebhookを受け取る
function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const body = e.postData.contents;
    const data = JSON.parse(body);

    // 署名検証（セキュリティ）
    const secret = props.getProperty('LINE_CHANNEL_SECRET');
    const sig = e.parameter['X-Line-Signature'] || '';
    if (secret && sig && !verifySignature_(body, sig, secret)) {
      return ContentService.createTextOutput('Unauthorized');
    }

    for (const event of (data.events || [])) {
      if (event.type === 'message' && event.message.type === 'text') {
        handleTextMessage_(event, props);
      } else if (event.type === 'postback') {
        handlePostback_(event, props);
      }
    }
  } catch (err) {
    Logger.log('LINE Bot Error: ' + err + '\n' + err.stack);
  }
  return ContentService.createTextOutput('OK');
}

// IG DM承認/保留ボタンのpostbackを処理する
function handlePostback_(event, props) {
  const data = event.postback.data;
  const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
  const replyToken = event.replyToken;

  // "action=dm_approve&fp=xxx" 形式をパース（URL-encoded値に対応）
  const params = {};
  data.split('&').forEach(function(pair) {
    const idx = pair.indexOf('=');
    if (idx < 0) return;
    const k = decodeURIComponent(pair.slice(0, idx));
    const v = decodeURIComponent(pair.slice(idx + 1));
    params[k] = v;
  });

  if (params.action === 'dm_approve') {
    try {
      const result = approveDmEntry_(params.fp);
      reply_(token, replyToken,
        '✅ @' + result.customerName + ' を受注シートに転記しました（' + result.rowNum + '行目）'
      );
    } catch (e) {
      Logger.log('dm_approve エラー: ' + e);
      reply_(token, replyToken, '⚠️ 転記エラー: ' + e.message);
    }
  } else if (params.action === 'dm_hold') {
    try {
      holdDmEntry_(params.fp);
      reply_(token, replyToken, '⏸ 保留にしました');
    } catch (e) {
      Logger.log('dm_hold エラー: ' + e);
      reply_(token, replyToken, '⚠️ 保留処理エラー: ' + e.message);
    }
  }
}

// 受注見込みエントリを受注シートへ転記し、受注見込みのステータスを更新する
function approveDmEntry_(fingerprint) {
  const snsSS = SpreadsheetApp.openById(SNS_SHEET_ID);
  const orderSheet = snsSS.getSheetByName('受注見込み');
  if (!orderSheet) throw new Error('受注見込みシートが見つかりません');

  const values = orderSheet.getDataRange().getValues();
  const headers = values[0];
  const fpIdx = headers.indexOf('fingerprint');
  if (fpIdx < 0) throw new Error('fingerprintカラムが見つかりません');

  let targetRow = null;
  const entry = {};
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][fpIdx]) === String(fingerprint)) {
      targetRow = r + 1; // 1-indexed（シートの行番号）
      headers.forEach(function(h, i) { entry[h] = values[r][i]; });
      break;
    }
  }
  if (!targetRow) throw new Error('fingerprintが見つかりません: ' + fingerprint);

  // 既に承認済みなら重複転記しない
  if (entry['ステータス'] === '承認済み') {
    return { rowNum: entry['転記先レコード番号'] || '?', customerName: entry['顧客名'] || '不明' };
  }

  // 受注シートへ転記
  const juchuSS = SpreadsheetApp.openById(JUCHU_SHEET_ID);
  const juchuSheet = juchuSS.getSheets()[0];
  const lastRow = juchuSheet.getLastRow();
  const recNo = lastRow; // ヘッダー行があるので lastRow が次の連番
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd');
  const 売上額 = entry['売上金額'] ? Number(entry['売上金額']) : null;
  const msgDetail = entry['元メッセージ'] ? String(entry['元メッセージ']).slice(0, 200) : '';

  const row = [
    recNo,                   // レコード番号
    'Instagram受注',         // タスク
    today,                   // 発注日
    entry['顧客名'] || '',   // 顧客名
    entry['商品名'] || '',   // 商品名
    msgDetail,               // 詳細（元メッセージ）
    'Instagram DM',          // 備考
    entry['単価'] || '',     // 単価
    entry['数量'] || '',     // 数量
    売上額,                  // 売上金額
    '',                      // 消費税（手動）
    '',                      // 不要
    売上額,                  // 売上（集計用）
    '',                      // 発送方法
    entry['納期見込'] || '', // 納期
    '',                      // 請求日（手動）
    '',                      // 領収日（手動）
    '',                      // 領収方法
    '',                      // 現金売上
    '',                      // Paypay売上
    '',                      // 振込売上
    '',                      // 領収証発行
    '',                      // 郵便番号
    '',                      // 住所
    '',                      // 宛名
    '',                      // 列2
    '',                      // 列3
    '',                      // square_item_id（将来Square連携で突合）
  ];
  juchuSheet.appendRow(row);
  const newRow = juchuSheet.getLastRow();

  // 受注見込みシートのステータスと転記先レコード番号を更新
  const statusIdx = headers.indexOf('ステータス');
  const recNoIdx = headers.indexOf('転記先レコード番号');
  if (statusIdx >= 0) orderSheet.getRange(targetRow, statusIdx + 1).setValue('承認済み');
  if (recNoIdx >= 0) orderSheet.getRange(targetRow, recNoIdx + 1).setValue(newRow);

  return { rowNum: newRow, customerName: entry['顧客名'] || '不明' };
}

// 受注見込みエントリのステータスを「保留」に更新する
function holdDmEntry_(fingerprint) {
  const snsSS = SpreadsheetApp.openById(SNS_SHEET_ID);
  const orderSheet = snsSS.getSheetByName('受注見込み');
  if (!orderSheet) return;

  const values = orderSheet.getDataRange().getValues();
  const headers = values[0];
  const fpIdx = headers.indexOf('fingerprint');
  const statusIdx = headers.indexOf('ステータス');

  for (var r = 1; r < values.length; r++) {
    if (String(values[r][fpIdx]) === String(fingerprint)) {
      if (statusIdx >= 0) orderSheet.getRange(r + 1, statusIdx + 1).setValue('保留');
      return;
    }
  }
}

// メッセージ処理のメイン
function handleTextMessage_(event, props) {
  const userId = event.source.userId;
  const text = event.message.text.trim();
  const replyToken = event.replyToken;
  const token = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');

  // マイIDコマンド（LINE_OWNER_USER_IDの登録に使う）
  if (text === 'マイID' || text === 'myid' || text === 'MY ID') {
    reply_(token, replyToken,
      'あなたのLINE User ID:\n' + userId + '\n\n' +
      'このIDをClaude Code環境変数とGitHub Secretsの\n' +
      'LINE_OWNER_USER_ID に登録すると、IG DM新着が\n' +
      'あなただけにFlexメッセージで届くようになります。'
    );
    return;
  }

  const cache = CacheService.getScriptCache();
  const pendingKey = 'pending_' + userId;
  const pendingJson = cache.get(pendingKey);

  // 確認待ち状態でOK
  if (pendingJson) {
    const okWords = ['ok', 'OK', 'Ok', 'はい', 'yes', 'YES', '登録', '◯', '○'];
    const ngWords = ['ng', 'NG', 'いいえ', 'no', 'NO', 'キャンセル', 'やめ', '×'];

    if (okWords.includes(text)) {
      const pending = JSON.parse(pendingJson);
      const rowNum = appendToJuchuSheet_(pending);
      cache.remove(pendingKey);
      reply_(token, replyToken, '✅ 受注シートに登録しました（' + rowNum + '行目）');
      return;
    }
    if (ngWords.includes(text)) {
      cache.remove(pendingKey);
      reply_(token, replyToken, 'キャンセルしました。もう一度入力してください。');
      return;
    }
  }

  // ヘルプコマンド
  if (text === 'ヘルプ' || text === '?' || text === '？') {
    reply_(token, replyToken,
      '【ShinCRAFT受注ボット】\n' +
      '受注・売上を自然に話しかけてください。\n\n' +
      '例：\n' +
      '「田中さんから多用途スタンド小 2個 6000円 直納」\n' +
      '「イベント出店売上 22000円 paypay」\n' +
      '「BIVコンサル料 77000円 振込」\n\n' +
      '登録後「OK」で台帳に追加します。\n\n' +
      '「マイID」を送るとLINE User IDを確認できます。'
    );
    return;
  }

  // Claude APIでメッセージを解析
  const apiKey = props.getProperty('ANTHROPIC_API_KEY');
  const parsed = parseWithClaude_(text, apiKey);

  if (!parsed || !parsed.顧客名) {
    reply_(token, replyToken,
      '受注内容が読み取れませんでした。\n' +
      '例：「田中さんに多用途スタンド小 1個 ¥3,000 直納」\n' +
      '「ヘルプ」と送ると使い方を表示します。'
    );
    return;
  }

  // 確認メッセージを作成してキャッシュに保存（10分）
  cache.put(pendingKey, JSON.stringify(parsed), 600);
  const confirmMsg = buildConfirmMsg_(parsed);
  reply_(token, replyToken, confirmMsg);
}

// Claude API でメッセージから受注情報を抽出
function parseWithClaude_(text, apiKey) {
  const prompt =
    '以下の受注メッセージから情報を抽出してJSONのみ返してください（説明不要）。\n' +
    '\n' +
    'フィールド定義：\n' +
    '- タスク: "完成"（個別受注）/"売上"（イベント出店・委託）/"コンサル" のいずれか\n' +
    '- 顧客名: 顧客名または店名（不明なら "不明"）\n' +
    '- 商品名: 商品・サービス名。下記のSquare正規商品名リストに該当するものは、表記揺れを直して' +
    'リストの正式名称に正規化する（例「スタンド」→「多用途スタンド」）。該当しなければ原文のまま。\n' +
    '  Square正規商品名: ' + SQUARE_ITEM_NAMES.join(' / ') + '\n' +
    '- 詳細: 詳細・デザイン内容（任意）\n' +
    '- 備考: その他のメモ（任意）\n' +
    '- 単価: 単価（数値。不明なら null）\n' +
    '- 数量: 数量（数値。不明なら 1）\n' +
    '- 売上: 合計金額（数値。単価×数量で算出。不明なら null）\n' +
    '- 発送方法: "直納"/"発送"/"店"/"" のいずれか\n' +
    '- 納期: 納期（YYYY/MM/DD形式。不明なら ""）\n' +
    '- 領収方法: "現金"/"paypay"/"振込"/"" のいずれか\n' +
    '\n' +
    'メッセージ：' + text;

  try {
    const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
      muteHttpExceptions: true,
    });
    const json = JSON.parse(res.getContentText());
    const rawText = json.content && json.content[0] && json.content[0].text;
    if (!rawText) return null;
    const match = rawText.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch (e) {
    Logger.log('Claude API error: ' + e);
    return null;
  }
}

// 確認メッセージを組み立てる
function buildConfirmMsg_(p) {
  const lines = ['【受注内容の確認】'];
  lines.push('種別：' + (p.タスク || '完成'));
  lines.push('顧客：' + (p.顧客名 || '—'));
  lines.push('商品：' + (p.商品名 || '—'));
  if (p.詳細) lines.push('詳細：' + p.詳細);
  if (p.備考) lines.push('備考：' + p.備考);
  if (p.単価) lines.push('単価：¥' + Number(p.単価).toLocaleString());
  lines.push('数量：' + (p.数量 || 1));
  if (p.売上) lines.push('売上：¥' + Number(p.売上).toLocaleString());
  if (p.発送方法) lines.push('発送：' + p.発送方法);
  if (p.納期) lines.push('納期：' + p.納期);
  if (p.領収方法) lines.push('領収：' + p.領収方法);
  lines.push('');
  lines.push('「OK」で登録 / 「NG」でキャンセル');
  return lines.join('\n');
}

// 受注シートに1行追加（テキストメッセージ経由の手動受注用）
function appendToJuchuSheet_(p) {
  const ss = SpreadsheetApp.openById(JUCHU_SHEET_ID);
  const sheet = ss.getSheets()[0]; // 先頭シート（受注管理）

  const lastRow = sheet.getLastRow();
  const recNo = lastRow; // 1行目ヘッダーなので last-1+1 = lastRow
  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd');

  const 領収方法 = (p.領収方法 || '').toLowerCase();
  const 売上額 = p.売上 ? Number(p.売上) : null;

  const row = [
    recNo,
    p.タスク || '完成',
    today,
    p.顧客名 || '',
    p.商品名 || '',
    p.詳細 || '',
    p.備考 || '',
    p.単価 || '',
    p.数量 || 1,
    売上額,
    '',
    '',
    売上額,
    p.発送方法 || '',
    p.納期 || '',
    '',
    '',
    p.領収方法 || '',
    領収方法 === '現金' ? 売上額 : '',
    領収方法 === 'paypay' ? 売上額 : '',
    領収方法 === '振込' ? 売上額 : '',
    '',
    '',
    '',
    '',
    '',
    '',
    p.square_item_id || '',
  ];

  sheet.appendRow(row);
  return sheet.getLastRow();
}

// LINEに返信する
function reply_(token, replyToken, text) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    payload: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: 'text', text: text }],
    }),
    muteHttpExceptions: true,
  });
}

// 署名検証（LINE Platform → GASの正当性確認）
function verifySignature_(body, signature, secret) {
  try {
    const hash = Utilities.computeHmacSha256Signature(body, secret);
    const b64 = Utilities.base64Encode(hash);
    return b64 === signature;
  } catch (e) {
    return false;
  }
}
