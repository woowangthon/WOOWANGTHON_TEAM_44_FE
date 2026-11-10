// 화면 계산 함수 테스트(API·브라우저 없이). npm test는 이 테스트 뒤에 빌드까지 확인한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { toMin, fmt, gradeRank, GRADE_KO, ACTION_KO, citeOrder, incState, needList, chooseView, pickTab, reraised } from '../src/util.js';

test('시각 변환', () => {
  assert.equal(toMin('03:30'), 210);
  assert.equal(fmt(210), '03:30');
  assert.equal(fmt(1439.9), '23:59');
  assert.equal(fmt(24 * 60 + 5), '00:05');
});

test('권고 등급 순서와 결정의 비교', () => {
  assert.ok(gradeRank('control_review') > gradeRank('report'));
  assert.ok(gradeRank('report') > gradeRank('observe'));
  assert.equal(gradeRank('report'), gradeRank(Object.keys(ACTION_KO)[0]));
  assert.equal(GRADE_KO.control_review, '통제 검토 요청 권고');
});

const inc = (o) => ({ id: 'I1', grade: 'report', decisions: [], nudges: [], grade_why: [], keys: [], opened_at: '05:00', ...o });

test('사건 줄 분류: 결정 전, 보류, 보류 뒤 재촉, 처리, 결정 뒤 권고 상승', () => {
  assert.equal(incState(inc({})), 'need');
  assert.equal(incState(inc({ grade: 'observe' })), 'watch');
  const held = inc({ grade: 'control_review', decisions: [{ action: 'hold', at: '06:02' }] });
  assert.equal(incState(held), 'held');
  const again = { ...held, nudges: [{ at: '07:00', text: '보류 이후 상황이 바뀌었습니다' }] };
  assert.equal(reraised(again), true);
  assert.equal(incState(again), 'need');
  assert.equal(incState(inc({ decisions: [{ action: 'report', at: '06:40', ai_grade_at_decision: 'report' }] })), 'done');
  assert.equal(incState(inc({ grade: 'control_review', decisions: [{ action: 'report', at: '06:40', ai_grade_at_decision: 'report' }] })), 'need');
  // 재촉받은 사건이 맨 앞, 그다음 통제 검토 요청 권고
  const list = needList([inc({ id: 'a' }), inc({ id: 'b', grade: 'control_review' }), { ...again, id: 'c' }]);
  assert.deepEqual(list.map((x) => x.id), ['c', 'b', 'a']);
});

test('화면 자동 전환: 고정 > 고른 사건 > 셋 이상이면 상황판 > 하나면 결정 > 평시·근무 기록', () => {
  assert.equal(chooseView({ pinned: 'night', needs: [1], picked: true }), 'night');
  assert.equal(chooseView({ pinned: 'auto', needs: [1, 2, 3], picked: true }), 'decide');
  assert.equal(chooseView({ pinned: 'auto', needs: [1, 2, 3] }), 'overview');
  assert.equal(chooseView({ pinned: 'auto', needs: [1] }), 'decide');
  assert.equal(chooseView({ pinned: 'auto', needs: [] }), 'standby');
  assert.equal(chooseView({ pinned: 'auto', needs: [], ended: true }), 'night');
});

test('근거 서랍의 첫 탭: 수위 근거면 수위, 하부도로면 지도', () => {
  const scn = { facilities: [{ id: 'F1', gauge: 'G1', type: 'riverside_road' }, { id: 'F3', type: 'underpass' }], timeseries: { G1: [['05:00', 1]] } };
  assert.equal(pickTab(inc({ facility_id: 'F1', grade_why: ['기준 도달: 흥덕교 홍수특보 또는 주의 수위 도달'] }), scn), 'level');
  assert.equal(pickTab(inc({ facility_id: 'F3', hazard: 'road_water' }), scn), 'map');
  assert.equal(pickTab(inc({ hazard: 'landslide' }), scn), 'signals');
});

test('조항 순서: 당직자가 할 일을 적은 조항 먼저, 「기록」 조항은 맨 뒤', () => {
  const cs = [{ heading: '제10조(기록)', quote: '당직자는 … 기록한다.' }, { heading: '제3조 제1항 제1호', quote: '수위가 기준에 도달한 경우' }, { heading: '제3조 제2항', quote: '당직자는 … 요청하고 보고한다.' }];
  assert.deepEqual(citeOrder(cs).map((c) => c.heading), ['제3조 제2항', '제3조 제1항 제1호', '제10조(기록)']);
});

test('공개 화면 코드에 API 키나 서버 비밀값 이름이 없다', () => {
  const files = [];
  const walk = (d) => readdirSync(new URL(d, import.meta.url), { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(`${d}${e.name}/`) : files.push(`${d}${e.name}`)));
  walk('../src/');
  for (const f of files) {
    const s = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!/sk-ant-|ANTHROPIC_API_KEY|DEMO_ACCESS_CODE/.test(s), f);
  }
});
