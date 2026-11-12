import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phraseOf, cleanPicked } from '../src/ui/phrase.js';

test('구절 표시: 칸 글에 그대로 있을 때만 구절, 아니면 칸 전체', () => {
  assert.equal(phraseOf({ quote: '별도 마감일 없음' }, '기간: 별도 마감일 없음(예산 소진 시)'), '별도 마감일 없음');
  assert.equal(phraseOf({ quote: '없는 말' }, '기간: 별도 마감일 없음'), '');
  assert.equal(phraseOf({}, '글'), '');
});

test('드래그한 글자 정리: 칸 번호·메모를 빼고 2자 이상만', () => {
  assert.equal(cleanPicked('e2  만 34세   이하 청년'), '만 34세 이하 청년');
  assert.equal(cleanPicked('n3 마감 D-10 메모: 오늘 기준', '메모: 오늘 기준'), '마감 D-10');
  assert.equal(cleanPicked('e1 가'), '');
});
