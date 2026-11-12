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

export const toMarkList = (marks) => Object.entries(marks).map(([sid, reason]) => ({ sid, reason }));

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
