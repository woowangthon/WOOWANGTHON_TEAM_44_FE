// 검증 수치: BE reports/g0/SUMMARY.md(11/12 G0 실험)에서 옮긴 값. G3에서 고정 판 검수 결과로 다시 채운다.
export const TESTSET = {
  note: '결재함 10건(코드가 오류 20개를 심고 정답을 확정한 지난 판 과제)으로 감사 모델이 심은 오류를 찾는지 쟀습니다. 헛짚음 가운데 일부는 작성 모델이 저절로 낸 진짜 오류였습니다.',
  rows: [
    ['Claude Opus 5.5', 'Anthropic', '20/20', 4],
    ['GPT-6.1 Sol', 'OpenAI', '19/20', 0],
    ['GPT-6 Astra', 'OpenAI', '20/20', 1],
    ['Gemini 4 Argon', 'Google', '18/20', 2],
    ['Claude Sonnet 5.5', 'Anthropic', '19/20', 6],
  ],
  at: '2026-11-12',
};
export const NATURAL = {
  note: '실사용 수준 모델(Claude Sonnet 5.5)에게 미션 두 개를 18번 맡기고 Opus·Sonnet이 감사한 81항목의 패턴입니다(AI 감사 기준, 사람 확인 전).',
  rows: [['한정어·조건 탈락', 22], ['근거보다 큰 결론', 18], ['지시 누락', 16], ['원자료에 없는 내용', 14], ['단위·기준 시점 혼동', 6], ['중요 정보 누락', 4], ['숫자 옮김 실수', 0]],
};
