// 화면 계산 함수 테스트(API·브라우저 없이). npm test는 이 테스트 뒤에 빌드까지 확인한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { toMin, fmt, gradeRank, GRADE_KO, ACTION_KO } from '../src/util.js';

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

test('공개 화면 코드에 API 키나 서버 비밀값 이름이 없다', () => {
  const files = [];
  const walk = (d) => readdirSync(new URL(d, import.meta.url), { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(`${d}${e.name}/`) : files.push(`${d}${e.name}`)));
  walk('../src/');
  for (const f of files) {
    const s = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!/sk-ant-|ANTHROPIC_API_KEY|DEMO_ACCESS_CODE/.test(s), f);
  }
});
