// 첫 화면: 대상·고리·두 입구, 미션과 고정 판 목록
import { useEffect, useState } from 'react';
import { api, myAnswers, modelName, fmtDate } from '../api.js';
import { LedgerTag } from '../ui/doc.jsx';

const LOOP = [['맡기기', 'Delegation'], ['지시하기', 'Description'], ['검증하기', 'Discernment'], ['고치게 하기', ''], ['책임지고 내보내기', 'Diligence']];
const STYLE_KO = { base: '기본', rough: '한 번에 맡김', careful: '잘 맡김' };

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.missions().then(setData).catch((e) => setError(e.message)); }, []);
  const solved = myAnswers.all();
  // 바로 풀 수 있는 판(사람 검수 완료)이 있는 미션을 먼저
  const missions = [...(data?.missions ?? [])].sort((a, b) => (b.fixed.some((f) => f.playable) ? 1 : 0) - (a.fixed.some((f) => f.playable) ? 1 : 0) || b.fixed.length - a.fixed.length);
  const firstRun = missions.flatMap((m) => m.fixed).find((f) => f.playable) ?? missions.flatMap((m) => m.fixed)[0];
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">AI 활용 평가가 있는 채용을 앞둔 대학생을 위해</p>
          <h1>AI에게 일을 맡기고, 틀린 곳을 잡고, 책임지고 내보내는 연습</h1>
          <p className="hero-lead">AI 동료(실제 모델)가 공공 보도자료로 여러 단계 업무를 처리합니다. 오류를 일부러 심지 않습니다. 단계를 넘기며 저절로 생긴 오류를, 작업 기록을 처음 보는 감사 모델(검수해 보기 판은 세 회사, 팀장 모드는 작업 회사를 뺀 두 회사)이 감사하고, 사람이 검수해 정답표를 만듭니다.</p>
          <p className="small muted loop-title">연습하는 고리(Anthropic의 AI 활용 4D 역량을 따름)</p>
          <ol className="loop">{LOOP.map(([k, e]) => <li key={k}><b>{k}</b>{e && <span>{e}</span>}</li>)}</ol>
          <p className="small terms"><b>사수 모드</b> AI 동료가 이미 끝낸 일을 검수합니다 · <b>팀장 모드</b> 내가 일을 나누고 지시해 맡깁니다 · <b>판</b> 한 번 돌린 작업 기록 · <b>장부</b> 그 판의 오류 정답표</p>
          {firstRun && <p><a className="btn btn-primary" href={`#/r/${firstRun.runId}`}>바로 해 보기: AI 동료가 쓴 단톡방 공지 검수하기</a></p>}
        </div>
        <div className="sheet mini-doc">
          <p className="small"><b>「챗봇에게 시키면 되지 않나요?」</b></p>
          <p className="small">시킬 수 있습니다. 문제는 결과를 믿어도 되는지입니다. 이 서비스를 만들며 실제 모델에 여러 단계 일을 맡겨 보니, 틀린 곳은 숫자 받아 적기가 아니라 조건이 다른 대상에 붙거나(「경력자 가운데 39세 이하」 → 「39세 이하 경력자」), 공지를 올리는 날이 아닌 작업한 날 기준 D-day가 남는 식이었습니다. 이런 오류는 원자료와 대조하지 않으면 보이지 않습니다.</p>
          <p className="small muted">근거와 수치는 「만든 방법과 검증」에 있습니다.</p>
        </div>
      </section>
      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">미션을 불러오는 중…</p>}
      {missions.map((m) => (
        <section key={m.id} className="inbox">
          <div className="inbox-head">
            <h2>{m.title}</h2>
            <p className="small muted">원자료 {m.sources}건 · 단계 {m.stages.map((s) => s.name).join(' → ')}</p>
          </div>
          <p className="small">{m.brief}</p>
          <div className="entries">
            <div>
              <h3>검수해 보기 <span className="muted small">사수 모드</span></h3>
              {!m.fixed.length && <p className="small muted">이 미션은 아직 검수할 판이 없습니다. 맡겨 보기(팀장 모드)는 할 수 있습니다.</p>}
              <ul className="run-list">
                {m.fixed.map((f) => (
                  <li key={f.runId}>
                    <a href={`#/r/${f.runId}`}>{fmtDate(f.at)} {modelName(f.worker)} 판</a> <LedgerTag status={f.ledger.status} version={f.ledger.version} />
                    {solved[f.runId] && <span className="tag">풀었음</span>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>맡겨 보기 <span className="muted small">팀장 모드</span></h3>
              <p className="small">단계를 나누고 지시를 써서 AI 동료에게 직접 맡깁니다. 끝나면 작업 회사를 뺀 두 회사가 감사해 장부를 만듭니다(사람 확인 전). 한 곳이 시간 안에 끝나지 않으면 끝난 감사만 반영합니다.</p>
              <a className="btn" href={`#/lead/${m.id}`}>이 미션 맡기기</a>
              {Object.keys(m.baseline ?? {}).length > 0 && <p className="small muted">기준: {Object.entries(m.baseline).map(([s, b]) => `${STYLE_KO[s] ?? s} ${b.n}판 평균 최종본 A ${b.meanAfinal}개`).join(' · ')} (AI 감사 기준)</p>}
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
