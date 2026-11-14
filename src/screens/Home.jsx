// 첫 화면: 대상·고리·두 입구, 미션과 고정 판 목록
import { useEffect, useState } from 'react';
import { api, myAnswers, modelName, fmtDate } from '../api.js';
import { LedgerTag } from '../ui/doc.jsx';

const STYLE_KO = { base: '기본', rough: '한 번에 맡김', careful: '잘 맡김' };

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.missions().then(setData).catch((e) => setError(e.message)); }, []);
  const solved = myAnswers.all();
  // 바로 풀 수 있는 판(사람 검수 완료)이 있는 미션을 먼저
  const missions = [...(data?.missions ?? [])].sort((a, b) => (b.fixed.some((f) => f.playable) ? 1 : 0) - (a.fixed.some((f) => f.playable) ? 1 : 0) || b.fixed.length - a.fixed.length);
  const playableOf = (m) => m.fixed.some((f) => f.playable);
  const ready = missions.filter(playableOf), waiting = missions.filter((m) => !playableOf(m));
  const mission = (m) => <Mission key={m.id} m={m} solved={solved} />;
  const firstRun = missions.flatMap((m) => m.fixed).find((f) => f.playable) ?? missions.flatMap((m) => m.fixed)[0];
  const firstMission = missions.find((m) => m.fixed.some((f) => f.runId === firstRun?.runId));
  const done1 = firstRun && solved[firstRun.runId];
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">AI 활용 평가가 있는 채용을 앞둔 대학생을 위해</p>
          <h1>AI에게 일을 맡기고, 틀린 곳을 잡고, 책임지고 내보내는 연습</h1>
          <p className="hero-lead">AI 동료(실제 모델)가 공공 보도자료로 학과 단톡방 공지까지 다섯 단계 일을 끝냈습니다. 원자료와 대조해 틀린 문장에 빨간 줄을 긋고, 이대로 내보내도 될지 결재하세요. 틀린 곳이 없을 수도 있습니다. 끝나면 놓친 오류가 어느 단계에서 생겨 어디로 번졌는지 돌려드립니다.</p>
          <ol className="steps" aria-label="해 볼 순서">
            <li><b>최종 공지 읽기</b></li>
            <li><b>틀린 문장을 눌러 빨간 줄</b></li>
            <li><b>승인 또는 반려 결재</b></li>
            <li className="steps-end">결과</li>
          </ol>
          {firstRun && <p className="hero-cta"><a className="btn btn-primary" href={`#/r/${firstRun.runId}`}>{done1 ? '결과 다시 보기' : '지금 해 보기'}</a> <span className="small muted" style={{ marginLeft: 8 }}>{done1 ? '이 판은 풀었습니다' : '로그인 없이 바로 시작합니다'}</span></p>}
          <p className="small terms"><b>판</b> AI가 한 번 돌린 작업 기록 · <b>장부</b> 그 판의 오류 정답표(사람 검수) · <b>A등급</b> 원자료와 대조하면 누구나 같은 결론이 나는 오류</p>
        </div>
        <figure className="hero-fig" aria-label="예시: 오류가 단계를 따라 번지는 모습">
          <HeroFigure />
          <figcaption className="small muted">예시 그림입니다(풀 판의 정답이 아님). 만들며 실제로 본 오류 모양: 원자료의 「경력 보유자 가운데 39세 이하」가 다음 단계에서 「39세 이하 경력자」가 되어 대상 조건이 바뀌는 식이었습니다. 이런 오류는 숫자를 대조해서는 보이지 않고, 뒤 단계로 그대로 옮겨 적힙니다.</figcaption>
        </figure>
      </section>

      <section aria-label="오늘의 연습">
        <h2 className="sec-title">오늘의 연습 <span className="small muted">잡기 → 막기 → 증명</span></h2>
        <div className="practice">
          <a className="pcard" href={firstRun ? `#/r/${firstRun.runId}` : '#/'}>
            <span className="pcard-k">잡기 · 약 10~20분</span>
            <b>판 하나 검수하기</b>
            <span>{firstMission ? `「${firstMission.title}」` : '여러 단계 작업 기록'}을 최종본부터 거슬러 읽고 빨간 줄 → 결재. 결과에서 놓친 오류의 「처음 생긴 곳」까지 따라갑니다.</span>
          </a>
          <a className="pcard" href="#/drill">
            <span className="pcard-k">잡기 · 1분</span>
            <b>짧은 연습 3문항</b>
            <span>판의 문장 하나와 원자료 문단을 보고 「맞다 / 틀렸다」를 고릅니다. 사람이 확정한 장부로 바로 확인합니다.</span>
          </a>
          <a className="pcard" href={firstRun ? `#/r/${firstRun.runId}` : '#/'}>
            <span className="pcard-k">막기 · 30초</span>
            <b>놓친 오류 막아 보기</b>
            <span>결과의 놓친 오류에서, 그 오류가 생긴 단계 하나만 지시를 고쳐 AI 동료에게 다시 시킵니다. 막혔는지 감사가 판정합니다.</span>
          </a>
          <a className="pcard" href="#/me">
            <span className="pcard-k">증명</span>
            <b>내 실력</b>
            <span>오류 유형별로 찾은 정도, 근거를 보고 그었는지, 확신이 맞았는지가 쌓입니다. 순위표는 두지 않습니다.</span>
          </a>
        </div>
      </section>

      <div className="hero-side two">
        <div className="how-made">
          <p className="small"><b>「챗봇에게 틀린 곳을 찾아 달라고 하면 되지 않나요?」</b></p>
          <p className="small">시킬 수 있습니다. 문제는 그 답을 믿어도 되는지입니다. 같은 작업 기록을 감사한 모델끼리도 짚는 항목이 0개부터 15개까지 갈렸습니다. 그래서 정답표는 사람이 한 항목씩 검수한 것만 씁니다.</p>
        </div>
        <div className="how-made">
          <p className="small"><b>정답표는 이렇게 만듭니다</b></p>
          <p className="small">오류를 일부러 심지 않습니다. 단계를 넘기며 저절로 생긴 오류를, 작업 기록을 처음 보는 다른 회사 감사 모델이 짚고, 코드가 근거 인용을 대조하고, 사람이 검수해 확정합니다. 틀렸다면 이의를 걸 수 있고, 받아들이면 장부가 새 판이 되어 다시 채점됩니다. <a href="#/about">만든 방법과 검증</a></p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="muted">미션을 불러오는 중…</p>}
      <h2 className="sec-title">미션</h2>
      {ready.map(mission)}
      {waiting.length > 0 && (ready.length ? (
        <details className="more-missions">
          <summary>준비 중인 미션 {waiting.length}개 <span className="small muted">· 아직 검수할 판이 없어 직접 맡기기(팀장 모드)만 됩니다</span></summary>
          {waiting.map(mission)}
        </details>
      ) : waiting.map(mission))}
    </main>
  );
}

/** 첫 화면 예시 그림: 단계 레일 위로 오류 하나가 처음 생긴 단계에서 공지까지 번진다(실제 판의 정답이 아님) */
function HeroFigure() {
  const st = [['S1', '자료 추출'], ['S2', '판정표'], ['S3', '해석'], ['S4', '팀장 보고'], ['S5', '단톡방 공지']];
  const x = (i) => 40 + i * 110;
  return (
    <svg viewBox="0 0 520 250" role="img" aria-label="S2에서 생긴 조건 오류가 S3·S4·S5로 옮겨 적힌 예시" className="hero-svg">
      <rect x="0" y="0" width="520" height="250" rx="12" className="hf-bg" />
      {st.map(([k, n], i) => (
        <g key={k}>
          <text x={x(i)} y="34" className="hf-k" textAnchor="middle">{k}</text>
          <text x={x(i)} y="52" className="hf-n" textAnchor="middle">{n}</text>
          <line x1={x(i)} y1="64" x2={x(i)} y2="150" className="hf-tick" />
        </g>
      ))}
      <rect x={x(1) - 46} y="62" width="92" height="92" rx="8" className="hf-stop" />
      <line x1={x(1)} y1="104" x2={x(4)} y2="104" className="hf-line" />
      <circle cx={x(1)} cy="104" r="8" className="hf-origin" />
      {[2, 3, 4].map((i) => <circle key={i} cx={x(i)} cy="104" r="7" className="hf-spread" />)}
      <text x={x(1)} y="140" className="hf-stoptext" textAnchor="middle">멈췄어야 할 곳</text>
      <g transform="translate(24,172)">
        <text x="0" y="16" className="hf-src">원자료</text>
        <text x="64" y="16" className="hf-txt">… 경력 보유자 가운데 39세 이하를 대상으로 …</text>
        <text x="0" y="48" className="hf-src">S2</text>
        <text x="64" y="48" className="hf-txt hf-ai">39세 이하 <tspan className="hf-wavy">경력자</tspan>이면 지원 가능</text>
      </g>
    </svg>
  );
}

function Mission({ m, solved }) {
  return (
    <section className="inbox">
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
          <h3>직접 맡기기 <span className="muted small">팀장 모드</span></h3>
          <p className="small">단계를 나누고 지시를 써서 AI 동료에게 직접 맡깁니다. 끝나면 작업 회사를 뺀 두 회사가 감사해 장부를 만듭니다(사람 확인 전). 한 곳이 시간 안에 끝나지 않으면 끝난 감사만 반영합니다.</p>
          <a className="btn" href={`#/lead/${m.id}`}>이 미션 맡기기</a>
          {Object.keys(m.baseline ?? {}).length > 0 && <p className="small muted">기준: {Object.entries(m.baseline).map(([s, b]) => `${STYLE_KO[s] ?? s} ${b.n}판 평균 최종본 A ${b.meanAfinal}개`).join(' · ')} (AI 감사 기준)</p>}
        </div>
      </div>
    </section>
  );
}
