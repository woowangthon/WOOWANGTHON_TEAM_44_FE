// 만든 방법과 검증: 근거, 파이프라인, 표시 규칙, 검증 수치(실험·검수·이의), 한계
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { TESTSET, NATURAL } from '../data/validation.js';

// 원문을 열어 문구를 확인한 것만 싣는다(11/12). 근거 정리: 사수연습_자료/채용검사_근거_1112.md
const MAP = [
  { test: 'OECD·EU의 AI 리터러시 기준은 「AI 결과물을 받아들일지, 고칠지, 거부할지 판단하기」를 역량 하나로 두고, 믿을 만한 출처와 대조해 정확성을 확인하는 단계를 둡니다.', here: '단계별 산출물을 원자료와 대조한 뒤 승인 또는 반려합니다.', src: 'OECD·EC, AI Literacy Framework 2026 (초·중등 교육 기준)', url: 'https://ailiteracyframework.org/' },
  { test: 'HD현대는 하반기 신입 공채에 「AI 활용 역량검사」를 처음 넣고, AI 결과물을 그대로 받아들이지 않고 비판적으로 분석해 업무에 맞게 재구성하는 능력까지 봅니다.', here: '팀장 모드에서 단계를 나누고 지시를 쓰고, 결과를 반려해 고치게 한 뒤 서명합니다.', src: '뉴시스 2026-09-12', url: 'https://www.newsis.com/view/NISX20260911_0003785699' },
  { test: 'AI 역량 진단 APTA는 자료에 AI가 틀리기 쉬운 내용을 섞어 두고, AI 답을 그대로 옮기는지 근거와 대조해 바로잡는지를 봅니다. 기업 임직원 평가에 쓰였습니다.', here: '결과물은 손대지 않고, 자료와 지시에만 함정을 둡니다(지난 마감, 「가운데 39세 이하」 같은 조건, 게시일과 작업일).', src: '조코딩AX파트너스 블로그 2026-11-02 (검사 업체 자료)', url: 'https://jocodingax.ai/blog/prove-ai-skills-for-jobs' },
  { test: '국내 IT 기업 채용에 쓰인 AI 역량평가 AISA에서 점수가 낮은 응시자는 검증 없이 AI의 답변을 그대로 받아들였습니다.', here: '놓친 오류마다 어디서 멈췄어야 했는지와 막는 지시를 돌려줍니다.', src: '전자신문 2026-09-01', url: 'https://m.etnews.com/20260901000167' },
];

export default function About() {
  const [st, setSt] = useState(null);
  useEffect(() => { api.stats().then(setSt).catch(() => {}); }, []);
  return (
    <main className="about">
      <h1>만든 방법과 검증</h1>
      <h2>실제 검사가 보는 것과 여기서 하는 것</h2>
      <div className="table-wrap"><table className="eval-table">
        <thead><tr><th>실제 검사·기준</th><th>여기서 하는 것</th></tr></thead>
        <tbody>{MAP.map((m) => <tr key={m.src}><td>{m.test} <a className="small" href={m.url} target="_blank" rel="noreferrer">{m.src}</a></td><td>{m.here}</td></tr>)}</tbody>
      </table></div>

      <h2>작업 기록과 정답표를 만드는 방법</h2>
      <ol>
        <li><b>작업</b>: 사람들이 실제로 쓰는 수준의 모델(Claude Sonnet 5.5, GPT-6.1 Sol, Gemini 3.8 Flash)이 공공 보도자료로 여러 단계 업무를 처리합니다. 단계마다 받은 것만 보고 일합니다. 오류를 일부러 심지 않고, 결과물은 손대지 않습니다.</li>
        <li><b>독립 감사</b>: 작업 기록을 처음 보는 감사 모델이 원자료와 단계별 산출물만 받아 오류 장부를 만듭니다. 감사는 작업 모델과 다른 회사 모델로 합니다(고정 판은 세 회사 모두, 팀장 모드는 작업 모델 회사를 뺀 두 회사).</li>
        <li><b>코드 대조</b>: 감사가 든 근거 구절이 원자료에 글자 그대로 있는지, 숫자가 원자료에 있는지, 남은 날 계산이 맞는지를 코드로 확인합니다.</li>
        <li><b>사람 검수</b>: 만든 사람이 먼저 정답을 보지 않고 풀어 본 뒤, 장부 항목을 하나씩 승인·수정·삭제하고, 원자료와 결과물을 나란히 놓고 장부에 없는 오류를 더합니다. 이렇게 확정한 장부로만 채점합니다.</li>
        <li><b>이의 제기</b>: 장부에 없는 오류, 오류가 아닌 항목에 이의를 걸 수 있습니다. 받아들이면 장부가 새 판이 되고, 이미 푼 사람의 결과를 다시 계산합니다.</li>
      </ol>
      <p className="small">표시: 「정답표: 사람 검수 완료 · 장부 n판」 / 「AI 감사(두 회사) · 사람 확인 전」. 점수는 A등급(원자료와 대조하면 누구나 같은 결론이 나는 오류)으로만 매기고 B·C는 참고로만 보여 줍니다.</p>

      <h2>기술 구성</h2>
      <ul>
        <li><b>모델 호출 한 곳</b>: 세 회사(Anthropic·OpenAI·Google)를 같은 모양으로 부르는 부분을 직접 만들었습니다. 답은 JSON 스키마로 받고, 형식이 깨지면 사유를 붙여 한 번 다시 요청하며(내용은 고치지 않음), 회사별 하루 금액 상한과 호출 기록을 둡니다. 긴 감사는 스트리밍으로 받아 서버 대기 한도(300초)에 끊기지 않게 했습니다.</li>
        <li><b>직접 만든 것</b>: 미션 실행기(단계마다 받을 것만 넘김), 감사 지시문, 코드 대조(근거 구절·숫자·남은 날 계산), 감사 묶기, 장부 판 관리, 채점, AI 1차 판정, 화면.</li>
        <li><b>외부 기술</b>: 모델 API(세 회사), 저장소 Upstash Redis, 배포 Vercel(서버 함수 5개), 화면 React·Vite.</li>
        <li><b>한 번 부를 때 비용과 시간(실험 기준)</b>: 작업 한 판(5단계) 약 $0.17·81~106초, 감사 한 번 약 $0.08~0.17·20~80초, AI 1차 판정 한 번 약 $0.02·5~10초.</li>
      </ul>

      <h2>검증 수치</h2>
      <p className="small">아래 첫 표의 시험지만 코드가 오류를 심어 만든 것입니다. 정답을 아는 과제로 감사 모델의 눈을 재기 위해서입니다. 사용자가 푸는 판에는 오류를 심지 않습니다.</p>
      <h3>감사 모델은 심은 오류를 찾는가</h3>
      <p className="small muted">{TESTSET.note} ({TESTSET.at})</p>
      <div className="table-wrap"><table className="eval-table"><thead><tr><th>감사 모델</th><th>회사</th><th>찾음</th><th>헛짚음(문장)</th></tr></thead>
        <tbody>{TESTSET.rows.map((r) => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td>{r[3]}</td></tr>)}</tbody></table></div>
      <h3>저절로 생긴 오류는 어떤 모양인가</h3>
      <p className="small muted">{NATURAL.note}</p>
      <div className="table-wrap"><table className="eval-table"><tbody>{NATURAL.rows.map((r) => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td></tr>)}</tbody></table></div>
      <h3>사람 검수에서 장부가 얼마나 바뀌었나</h3>
      {st?.ledgers?.length ? (
        <div className="table-wrap"><table className="eval-table"><thead><tr><th>판</th><th>AI 장부 항목(A)</th><th>확정 항목(A)</th><th>삭제</th><th>등급 바꿈</th><th>사람이 추가</th></tr></thead>
          <tbody>{st.ledgers.map((l) => <tr key={l.runId}><td className="mono">{l.runId}</td><td>{l.aiItems}({l.aiA})</td><td>{l.finalItems}({l.finalA})</td><td>{l.deleted}</td><td>{l.gradeChanged}</td><td>{l.added}</td></tr>)}</tbody></table></div>
      ) : <p className="muted small">아직 검수를 마친 판이 없습니다.</p>}
      <h3>이의 제기</h3>
      <p>{st ? `접수 ${st.objections.total}건 · 받아들임 ${st.objections.accepted}건 · 받아들이지 않음 ${st.objections.rejected}건 · 대기 ${st.objections.open}건 (만든 사람 기기 제외)` : '—'}</p>
      <h3>사용</h3>
      <p>{st ? `검수 ${st.usage.answers}판(처음 푼 판 ${st.usage.firstAnswers}) · 맡기기 ${st.usage.leads}판 · 기기 ${st.usage.devices}대. 만든 사람 기록(검수 ${st.usage.makerAnswers}, 맡기기 ${st.usage.makerLeads})은 빼고 셉니다.` : '—'}</p>

      <h2>한계</h2>
      <ul>
        <li>감사 모델마다 보는 폭이 크게 다릅니다. 같은 판에서 한 감사는 A를 0~2개, 다른 감사는 6~14개로 매긴 일이 있습니다. 그래서 사람 검수 없이 점수를 매기지 않습니다.</li>
        <li>사람 검수는 만든 사람 한 명이 합니다. 놓친 오류는 이의 제기로만 보완됩니다.</li>
        <li>팀장 모드의 장부는 사람 확인 전입니다. 결과 지표는 참고로 보고, 이의를 걸 수 있습니다.</li>
      </ul>
    </main>
  );
}
