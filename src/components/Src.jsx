// 화면의 각 내용이 어디서 나왔는지 표시한다: AI(점선), 규칙표(실선), 당직자(채움)
const LABEL = { ai: 'AI', rule: '규칙표', human: '당직자' };
const HELP = {
  ai: 'Claude가 만든 내용입니다. 검증기를 통과한 것만 화면에 올립니다.',
  rule: '코드의 규칙표가 정한 내용입니다. AI 판단이 들어가지 않습니다.',
  human: '당직자가 직접 고르고 사유를 쓴 결정입니다.',
};

export default function Src({ k, children }) {
  return <span className={`src src-${k}`} title={HELP[k]}>{children ?? LABEL[k]}</span>;
}
