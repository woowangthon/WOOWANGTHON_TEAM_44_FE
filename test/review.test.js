import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toggleMark, setReason, decisionGate, toMarkList, clock, peerLine } from '../src/review.js';

test('표시: 누르면 생기고 다시 누르면 거둔다, 사유는 표시한 문장에만', () => {
  let m = toggleMark({}, 's2');
  assert.deepEqual(m, { s2: null });
  m = setReason(m, 's2', '숫자·단위');
  assert.deepEqual(m, { s2: '숫자·단위' });
  assert.deepEqual(setReason(m, 's3', '기타'), m);
  assert.deepEqual(setReason(m, 's2', '아무거나'), m);
  assert.deepEqual(setReason(m, 's2', '숫자·단위'), { s2: null });
  assert.deepEqual(toggleMark(m, 's2'), {});
  assert.deepEqual(toMarkList({ s1: null, s4: '기타' }), [{ sid: 's1', reason: null }, { sid: 's4', reason: '기타' }]);
});

test('판정: 표시 없이 반려 불가, 표시 둔 채 승인은 확인', () => {
  assert.equal(decisionGate({}, '반려').ok, false);
  assert.deepEqual(decisionGate({}, '승인'), { ok: true });
  assert.match(decisionGate({ s1: null }, '승인').confirm, /1개/);
  assert.deepEqual(decisionGate({ s1: null }, '반려'), { ok: true });
});

test('시계와 비율 문구', () => {
  assert.equal(clock(65), '1:05');
  assert.equal(clock(-3), '0:00');
  assert.match(peerLine({ firstPlays: 0 }, 's1'), /기록이 없습니다/);
  assert.equal(peerLine({ firstPlays: 4, planted: { s1: { found: 1 } } }, 's1'), '처음 푼 4명 가운데 1명(25%)이 찾았습니다. 아직 수가 적어 참고만 하세요.');
});
