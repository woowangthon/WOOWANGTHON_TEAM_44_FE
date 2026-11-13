// 수요 근거: 만든 사람이 학과 학생에게 카톡으로 직접 받은 짧은 설문. 받은 답만 그대로 옮긴다(숫자를 지어내지 않는다).
// 채우는 법: ready를 true로 바꾸고 sample·questions를 채운다. ready가 false면 화면에 「설문 정리 중」만 보인다.
export const DEMAND = {
  ready: false,
  // 표본 설명: 누구에게(학과·학년), 몇 명, 언제, 어떻게(카톡 1:1 / 단톡방), 누가 골랐는지
  sample: { who: '', n: null, when: '', how: '', note: '' },
  // 물은 것과 답: { q: '물은 말 그대로', answers: [['보기', 사람 수], …] 또는 quotes: ['답 그대로', …] }
  questions: [],
  // 이 설문으로 말할 수 없는 것(표본이 작음, 아는 사람에게 물음 등)
  limits: [],
};
