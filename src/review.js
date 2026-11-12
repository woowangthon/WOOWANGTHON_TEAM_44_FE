// 검수 화면의 상태 계산. 화면(React)과 떼어 두어 node --test로 확인한다.

export const REASONS = ['숫자·단위', '원자료에 없음', '방향·주체가 바뀜', '계산', '근거보다 큰 결론', '기타'];

/** 표시 상태: { [sid]: reason | null }. 같은 문장을 다시 누르면 표시를 거둔다 */
export function toggleMark(marks, sid) {
  const next = { ...marks };
  if (sid in next) delete next[sid];
  else next[sid] = null;
  return next;
}

export function setReason(marks, sid, reason) {
  if (!(sid in marks) || !REASONS.includes(reason)) return marks;
  return { ...marks, [sid]: marks[sid] === reason ? null : reason };
}

/** 판정 버튼을 누를 수 있는가, 누르기 전에 무엇을 확인할까 */
export function decisionGate(marks, decision) {
  const n = Object.keys(marks).length;
  if (decision === '반려' && n === 0) return { ok: false, message: '반려하려면 틀린 문장을 하나 이상 표시하세요.' };
  if (decision === '승인' && n > 0) return { ok: true, confirm: `표시한 문장 ${n}개가 있습니다. 표시를 둔 채 승인하면 그 문장들도 그대로 나갑니다. 승인할까요?` };
  return { ok: true };
}

export const toMarkList = (marks, notes = {}) => Object.entries(marks).map(([sid, reason]) => {
  const note = (notes[sid] ?? '').trim();
  return note ? { sid, reason, note: note.slice(0, 150) } : { sid, reason };
});

/** 놓친 오류마다 「어디서 멈추고 확인했어야 했는지」 */
export const STOP_TIPS = {
  '숫자·단위': '숫자가 나오면 멈추고 원자료의 같은 숫자를 찾아 단위(%와 %p, 천과 만)까지 한 글자씩 맞춰 보세요.',
  '원자료에 없음': '「~때문에」「~에 따라」처럼 원인이나 효과를 붙인 구절에서 멈추고, 원자료에 그 말이 있는지 찾아보세요.',
  '방향·주체가 바뀜': '증가·감소 같은 방향어에서 멈추고, 숫자가 맞더라도 원자료의 방향과 같은지 따로 확인하세요.',
  '근거보다 큰 결론': '원자료의 「계획」「예정」「최대」「일부」 같은 한정어가 결과물에 남았는지 보세요. 빠지면 단정이 됩니다.',
  계산: '결과물이 새로 계산한 값은 원자료 숫자로 직접 다시 계산해 보세요.',
  기타: '문장마다 근거 문단을 하나씩 찾아 짝지어 보세요.',
};

/** 공유용 한 줄 */
export function shareText(title, r, url) {
  const c = r.counts;
  const found = c.planted ? `틀린 문장 ${c.planted}곳 중 ${c.found}곳 찾음` : '틀린 곳 없는 보고서';
  return `[Redline] AI 신입 보고서 「${title}」 결재: ${found}, 판정 ${r.decisionOk ? '맞음' : '틀림'}, ${r.score}점. 공채 AI 활용 평가 대비 검수 연습 ${url}`;
}

export function clock(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 같은 과제를 처음 푼 사람 가운데 이 오류를 찾은 비율 문구 */
export function peerLine(peers, sid) {
  const n = peers?.firstPlays ?? 0;
  if (!n) return '아직 이 과제를 처음 푼 사람의 기록이 없습니다.';
  const f = peers.planted?.[sid]?.found ?? 0;
  return `처음 푼 ${n}명 가운데 ${f}명(${Math.round((f / n) * 100)}%)이 찾았습니다.${n < 5 ? ' 아직 수가 적어 참고만 하세요.' : ''}`;
}

/** 근거 위치 표기: p3 → 3문단, r2 → 표 2행 */
export function pidLabel(pid) {
  const m = String(pid).match(/^([pr])(\d+)$/);
  if (!m) return String(pid);
  return m[1] === 'r' ? `표 ${m[2]}행` : `${m[2]}문단`;
}
