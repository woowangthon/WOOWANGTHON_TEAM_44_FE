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
      {/* 첫 화면: 메시지 하나, 행동 하나, 그림 하나. 나머지는 스크롤하며 한 덩어리에 한 생각씩 */}
      <section className="hero hero-first">
        <div className="hero-copy">
          <p className="eyebrow">AI 활용 평가를 앞둔 대학생을 위한 검수 연습</p>
          <h1>AI가 끝낸 일,<br />어디서 틀렸을까요?</h1>
          <p className="hero-lead">실제 AI가 다섯 단계로 만든 공지를 원자료와 대조해 틀린 곳에 빨간 줄을 긋고, 어디서 멈췄어야 했는지 돌려받습니다.</p>
          {firstRun && <p className="hero-cta"><a className="btn btn-primary" href={`#/r/${firstRun.runId}`}>{done1 ? '결과 다시 보기' : '지금 해 보기'}</a><span className="small muted">{done1 ? '이 판은 풀었습니다' : '로그인 없이 바로'}</span></p>}
        </div>
        <figure className="hero-fig" aria-label="예시: 「자료에 없음」이 단계를 넘으며 「언제든 신청 가능」이 되는 모습">
          <HeroFigure />
          <figcaption className="small muted">예시(풀 판의 문장 아님). 단계마다 그럴듯하지만, 원자료와 대조해야 S2에서 뜻이 뒤집힌 것이 보입니다.</figcaption>
        </figure>
      </section>

      <section className="how" aria-label="이렇게 진행됩니다">
        <h2 className="sec-title">이렇게 진행됩니다</h2>
        <ol className="how-steps">
          <li><b>읽기</b><span>AI 동료가 끝낸 최종 공지부터 원자료와 한 문장씩 대조합니다.</span></li>
          <li><b>빨간 줄과 결재</b><span>틀린 문장에 빨간 줄을 긋고, 이대로 내보낼지 승인 또는 반려합니다.</span></li>
          <li><b>멈췄어야 할 곳</b><span>놓친 오류가 어느 단계에서 생겨 어디로 번졌는지, 다음엔 어떤 지시로 막을지 돌려받습니다.</span></li>
        </ol>
      </section>

      <section aria-label="오늘의 연습">
        <h2 className="sec-title">오늘의 연습 <span className="small muted">잡기 → 막기 → 증명</span></h2>
        <p className="small terms"><b>판</b> AI가 한 번 돌린 작업 기록 · <b>장부</b> 그 판의 오류 정답표(사람 검수) · <b>A등급</b> 원자료와 대조하면 누구나 같은 결론이 나는 오류</p>
        <div className="practice">
          <Slide as="a" from="left" fromSm="left" fromLg="left" delay={0} className="pcard" href={firstRun ? `#/r/${firstRun.runId}` : '#/'}>
            <span className="pcard-k">잡기 · 판 하나</span>
            <b>판 하나 검수하기</b>
            <span>{firstMission ? `「${firstMission.title}」` : '여러 단계 작업 기록'}을 최종본부터 거슬러 읽고 빨간 줄 → 결재. 결과에서 놓친 오류의 「처음 생긴 곳」까지 따라갑니다.</span>
          </Slide>
          <Slide as="a" from="left" fromSm="right" fromLg="up" delay={60} className="pcard" href="#/drill">
            <span className="pcard-k">잡기 · 3문항</span>
            <b>짧은 연습 3문항</b>
            <span>판의 문장 하나와 원자료 문단을 보고 「맞다 / 틀렸다」를 고릅니다. 사람이 확정한 장부로 바로 확인합니다.</span>
          </Slide>
          <Slide as="a" from="left" fromSm="left" fromLg="up" delay={120} className="pcard" href={firstRun ? `#/r/${firstRun.runId}` : '#/'}>
            <span className="pcard-k">막기 · 다시 시키기 약 30초</span>
            <b>놓친 오류 막아 보기</b>
            <span>결과의 놓친 오류에서, 그 오류가 생긴 단계 하나만 지시를 고쳐 AI 동료에게 다시 시킵니다. 막혔는지 감사가 판정합니다.</span>
          </Slide>
          <Slide as="a" from="left" fromSm="right" fromLg="right" delay={180} className="pcard" href="#/me">
            <span className="pcard-k">증명</span>
            <b>내 실력</b>
            <span>오류 유형별로 찾은 정도, 근거를 보고 그었는지, 확신이 맞았는지가 쌓입니다. 순위표는 두지 않습니다.</span>
          </Slide>
        </div>
      </section>

      <div className="hero-side two">
        <Slide from="left" className="how-made">
          <p className="small"><b>「챗봇에게 틀린 곳을 찾아 달라고 하면 되지 않나요?」</b></p>
          <p className="small">시킬 수 있습니다. 문제는 그 답을 믿어도 되는지입니다. 같은 작업 기록을 감사한 모델끼리도 짚는 항목이 0개부터 15개까지 갈렸습니다. 그래서 정답표는 사람이 한 항목씩 검수한 것만 씁니다.</p>
        </Slide>
        <Slide from="left" fromSm="right" className="how-made">
          <p className="small"><b>정답표는 이렇게 만듭니다</b></p>
          <p className="small">오류를 일부러 심지 않습니다. 단계를 넘기며 저절로 생긴 오류를, 작업 기록을 처음 보는 다른 회사 감사 모델이 짚고, 코드가 근거 인용을 대조하고, 사람이 검수해 확정합니다. 틀렸다면 이의를 걸 수 있고, 받아들이면 장부가 새 판이 되어 다시 채점됩니다. <a href="#/about">만든 방법과 검증</a></p>
        </Slide>
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
