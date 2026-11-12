// 빨간 줄 구절 다루기(JSX 없음, 테스트용으로 따로 둔다)
/** 표시에 고른 구절이 그 칸 글에 그대로 있을 때만 구절로 긋는다. 없으면 '' → 칸 전체 */
export const phraseOf = (m, text) => (m?.quote && text && text.includes(m.quote) ? m.quote : '');
/** 드래그한 글자에서 앞의 칸 번호(e2 등)와 덧붙은 메모를 빼고 공백을 한 칸으로. 2자 미만이면 '' */
export function cleanPicked(raw, noteText = '') {
  let t = String(raw ?? '');
  if (noteText && t.includes(noteText)) t = t.replace(noteText, '');
  t = t.replace(/^\s*[a-z]+\d+\s+/i, '').replace(/\s+/g, ' ').trim();
  return t.length >= 2 ? t : '';
}
