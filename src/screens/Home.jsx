// 첫 화면: 대상·고리·두 입구, 미션과 고정 판 목록
import { useEffect, useState } from 'react';
import { api, myAnswers, modelName, fmtDate } from '../api.js';
import { LedgerTag } from '../ui/doc.jsx';
import Slide from '../ui/Slide.jsx';

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
      {/* 첫 화면: 메시지 하나, 행동 하나, 그림 하나. 아래로는 왜 해 봐야 하나 → 한 판에서 얻는 것 → 시작 → 믿을 수 있는 이유 → 미션 순서로, 읽다 멈춘 곳에서 바로 시작할 수 있게 */}
      <section className="hero hero-first">
        <div className="hero-copy">
          <p className="eyebrow">AI 활용 평가를 앞둔 대학생을 위한 검수 연습</p>
          <h1>AI가 끝낸 일,<br />어디서 틀렸을까요?</h1>
          <p className="hero-lead">실제 AI가 다섯 단계로 만든 공지를 원자료와 대조해 틀린 곳에 빨간 줄을 긋고, 어디서 멈췄어야 했는지 돌려받습니다. 가입 없이 바로 시작합니다.</p>
          {firstRun && <p className="hero-cta"><StartButton run={firstRun} done={done1} /></p>}
        </div>
        <figure className="hero-fig" aria-label="예시: 「자료에 없음」이 단계를 넘으며 「언제든 신청 가능」이 되는 모습">
          <HeroFigure />
          <figcaption className="small muted">예시(풀 판의 문장 아님). 단계마다 그럴듯하지만, 원자료와 대조해야 S2에서 뜻이 뒤집힌 것이 보입니다.</figcaption>
        </figure>
      </section>

      <section className="why" aria-label="왜 연습해야 하나요">
        <h2 className="sec-title">훑어보면 맞아 보입니다</h2>
        <p className="why-lead">AI 활용 역량검사를 넣는 공채가 늘고 있습니다. 보는 것은 결국 하나, AI가 낸 결과를 근거와 대조해 그대로 내보낼지 판단하는 힘입니다. 그런데 이 힘은 혼자서는 연습하기 어렵습니다.</p>
        <div className="why-stats">
          <Slide from="up" className="why-stat">
            <b className="why-num">0<small>건</small> · 22<small>건</small></b>
            <span className="why-k">AI는 숫자보다 조건을 틀립니다</span>
            <span className="why-t">실제 모델에게 여러 단계 일을 18번 맡겨 보니 숫자를 잘못 옮긴 오류는 0건, 조건이 다른 대상에 붙거나 빠진 오류는 22건이었습니다. 원자료와 대조하지 않으면 보이지 않습니다.<em> (AI 감사 기준)</em></span>
          </Slide>
          <Slide from="up" delay={80} className="why-stat">
            <b className="why-num">3<small> / 5</small></b>
            <span className="why-k">만든 사람도 다 못 찾았습니다</span>
            <span className="why-t">정답표를 보기 전에 이 판을 직접 풀었을 때, 꼭 잡아야 할 오류 5개 가운데 3개만 찾았습니다. 놓친 둘은 모두 첫 단계의 같은 문장에서 생긴 오류였습니다.</span>
          </Slide>
          <Slide from="up" delay={160} className="why-stat">
            <b className="why-num">0<small>~</small>15<small>개</small></b>
            <span className="why-k">챗봇에게 맡기면 답이 갈립니다</span>
            <span className="why-t">같은 작업 기록을 감사한 AI끼리도 짚은 오류가 0개부터 15개까지 달랐습니다. 그래서 여기서는 사람이 한 항목씩 검수한 정답표로만 채점합니다.</span>
          </Slide>
        </div>
      </section>

      <section aria-label="한 판을 풀면 얻는 것">
        <h2 className="sec-title">한 판을 풀면 이것을 돌려받습니다 <span className="small muted">잡기 → 막기 → 증명</span></h2>
        <div className="practice">
          <Slide as="a" from="left" fromSm="left" fromLg="left" delay={0} className="pcard" href={firstRun ? `#/r/${firstRun.runId}` : '#/'}>
            <span className="pcard-k">01 · 잡기</span>
            <b>어디서 처음 틀렸나</b>
            <span>{firstMission ? `「${firstMission.title}」` : '여러 단계 작업 기록'}을 최종본부터 원자료와 대조해 빨간 줄을 긋고 결재합니다. 결과에서 놓친 오류가 처음 생긴 단계와 옮겨 적힌 길이 지도로 나옵니다.</span>
          </Slide>
          <Slide as="a" from="left" fromSm="right" fromLg="up" delay={60} className="pcard" href={firstRun ? `#/r/${firstRun.runId}` : '#/'}>
            <span className="pcard-k">02 · 돌아보기</span>
            <b>근거를 보고 그었나</b>
            <span>놓친 오류마다 그 근거 문단이 내 화면에 한 번이라도 보였는지, 확실하다고 그은 줄이 맞았는지 알려 줍니다. 대충 훑은 곳이 드러납니다.</span>
          </Slide>
          <Slide as="a" from="left" fromSm="left" fromLg="up" delay={120} className="pcard" href={firstRun ? `#/r/${firstRun.runId}` : '#/'}>
            <span className="pcard-k">03 · 막기</span>
            <b>지시를 고치면 막히나</b>
            <span>놓친 오류가 생긴 단계 하나만 지시를 고쳐 AI에게 실제로 다시 시킵니다. 막혔는지 다른 회사 AI와 코드가 판정합니다(약 30초).</span>
          </Slide>
          <Slide as="a" from="left" fromSm="right" fromLg="right" delay={180} className="pcard" href="#/drill">
            <span className="pcard-k">04 · 증명</span>
            <b>다음엔 잡나</b>
            <span>결재한 판의 문장으로 하루 3문항 짧은 연습을 하고, 오류 유형별로 찾은 정도가 내 실력에 쌓입니다. 순위표는 두지 않습니다.</span>
          </Slide>
        </div>
        {firstRun && !done1 && <p className="cta-row"><StartButton run={firstRun} done={done1} /><span className="small muted">첫 판: {firstMission ? `「${firstMission.title}」` : ''} · AI가 실제로 한 작업 기록 · 정답표 사람 검수 완료</span></p>}
      </section>

      <div className="hero-side two">
        <Slide from="left" className="how-made">
          <p className="small"><b>「챗봇에게 틀린 곳을 찾아 달라고 하면 되지 않나요?」</b></p>
          <p className="small">시킬 수 있습니다. 문제는 그 답을 믿어도 되는지입니다. 그래서 오류를 일부러 심지 않고, AI가 단계를 넘기며 저절로 낸 오류만 씁니다. 결과물은 손대지 않습니다.</p>
        </Slide>
        <Slide from="left" fromSm="right" className="how-made">
          <p className="small"><b>정답표는 이렇게 만듭니다</b></p>
          <p className="small">작업 기록을 처음 보는 다른 회사 AI가 짚고, 코드가 근거 인용을 대조하고, 사람이 검수해 확정합니다. 틀렸다면 이의를 걸 수 있고, 받아들이면 장부가 새 판이 되어 다시 채점됩니다. <a href="#/about">만든 방법과 검증</a></p>
        </Slide>
      </div>
      <p className="small terms"><b>판</b> AI가 한 번 돌린 작업 기록 · <b>장부</b> 그 판의 오류 정답표(사람 검수) · <b>A등급</b> 원자료와 대조하면 누구나 같은 결론이 나는 오류</p>

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
      {firstRun && !done1 && (
        <section className="cta-band" aria-label="시작">
          <div><b>준비됐다면, 첫 판부터</b><p className="small muted">최종본부터 원자료와 대조해 빨간 줄을 긋고 결재하면, 놓친 오류가 어디서 생겼는지 바로 돌려받습니다.</p></div>
          <StartButton run={firstRun} done={done1} />
        </section>
      )}
    </main>
  );
}

/** 첫 판 시작 버튼(첫 화면 여러 곳에서 같은 행동) */
function StartButton({ run, done }) {
  return <a className="btn btn-primary" href={`#/r/${run.runId}`}>{done ? '결과 다시 보기' : '첫 판 검수 시작'}</a>;
}

/** 첫 화면 예시 그림: 단계 레일 위로 오류 하나가 처음 생긴 단계에서 공지까지 번진다(실제 판의 정답이 아님) */
const HERO_ROWS = [
  ['원자료', <>신청 기간은 <b>추후 공지할 예정</b>입니다.</>, 'src'],
  ['S2 판정표', <>신청 기간 <span className="hf-bad">없음 → 상시 신청 가능</span></>, 'origin'],
  ['S5 단톡방 공지', <>📌 <span className="hf-bad">언제든 신청 가능!</span></>, 'spread'],
];
const HF_TAG = { ok: ['맞음', 'hf-tag-ok'], origin: ['처음 틀림', 'hf-tag-bad'], spread: ['옮겨 적힘', 'hf-tag-spread'], src: ['', ''] };
function HeroFigure() {
  const st = ['S1', 'S2', 'S3', 'S4', 'S5'];
  const x = (i) => 40 + i * 110;
  return (
    <div className="hero-fig-box">
      <svg viewBox="0 0 520 96" role="img" aria-label="S2에서 처음 틀리고 S3·S4·S5로 옮겨 적힌 오류 하나" className="hero-svg">
        {st.map((k, i) => (
          <g key={k}>
            <text x={x(i)} y="20" className="hf-k" textAnchor="middle">{k}</text>
            <line x1={x(i)} y1="30" x2={x(i)} y2="86" className="hf-tick" />
          </g>
        ))}
        <rect x={x(1) - 40} y="30" width="80" height="58" className="hf-stop" />
        <line x1={x(1)} y1="58" x2={x(4)} y2="58" className="hf-line" />
        <circle cx={x(0)} cy="58" r="7" className="hf-okdot" />
        <circle cx={x(1)} cy="58" r="8" className="hf-origin" />
        {[2, 3, 4].map((i) => <circle key={i} cx={x(i)} cy="58" r="7" className="hf-spread" />)}
        <text x={x(1)} y="82" className="hf-stoptext" textAnchor="middle">멈췄어야 할 곳</text>
      </svg>
      <ol className="hf-rows">
        {HERO_ROWS.map(([label, text, kind], i) => (
          <li key={label} className={`hf-row hf-${kind}`} style={{ '--i': i }}>
            <span className="hf-label">{label}</span>
            <span className="hf-text">{text}</span>
            {HF_TAG[kind][0] && <span className={`hf-tag ${HF_TAG[kind][1]}`}>{HF_TAG[kind][0]}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Mission({ m, solved }) {
  return (
    <Slide as="section" from="up" className="inbox">
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
    </Slide>
  );
}
