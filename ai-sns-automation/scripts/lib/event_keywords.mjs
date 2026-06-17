// 出店・イベント告知の判定キーワード（IG→LINE / 台帳→LINE 両ミラーで共有）。
// 日常の軽い投稿を全友だちに一斉送信しないための絞り込み。

export const EVENT_KEYWORDS = [
  '出店', '出展', 'イベント', 'マルシェ', 'マーケット', 'フェス', 'フェア',
  'ワークショップ', '体験会', '販売会', '出店予定', '出店情報',
  'POPUP', 'POP UP', 'ポップアップ', '催事', 'にて開催', '開催します', '出店します',
];

/** テキストに出店・イベント告知キーワードが含まれるか */
export function isEventPost(caption) {
  const text = String(caption || '');
  return EVENT_KEYWORDS.some((kw) => text.includes(kw));
}
