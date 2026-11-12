import { useEffect, useState } from 'react';
import { api, myRecords } from '../api.js';
import { Badge, trackName } from '../ui/parts.jsx';

// 원문을 열어 문구를 확인한 것만 싣는다(11/12). 근거 정리: 사수연습_자료/채용검사_근거_1112.md
const MAP = [
  {
    test: 'OECD·EU의 AI 리터러시 기준은 「AI 결과물을 받아들일지, 고칠지, 거부할지 판단하기」를 역량 하나로 두고, 믿을 만한 출처와 대조해 정확성을 확인하는 단계를 둡니다.',
    here: '보고서를 원자료와 대조한 뒤 승인 또는 반려를 정합니다.',
    src: 'OECD·EC, AI Literacy Framework 2026 (초·중등 교육 기준)', url: 'https://ailiteracyframework.org/',
  },
  {
    test: 'HD현대는 하반기 신입 공채에 「AI 활용 역량검사」를 처음 넣고, AI 결과물을 그대로 받아들이지 않고 비판적으로 분석해 업무에 맞게 재구성하는 능력까지 봅니다.',
    here: '그럴듯하게 쓴 결과물에서 틀린 문장을 짚고, 신입이 고쳐 온 문장을 확인합니다.',
    src: '뉴시스 2026-09-12', url: 'https://www.newsis.com/view/NISX20260911_0003785699',
  },
  {
    test: 'AI 역량 진단 APTA는 자료에 AI가 틀리기 쉬운 내용을 섞어 두고, AI 답을 그대로 옮기는지 근거와 대조해 바로잡는지를 봅니다. 기업 임직원 평가에 쓰였습니다.',
    here: '숫자·단위, 증가와 감소, 원자료에 없는 주장, 추정을 단정한 문장을 일부러 심어 둡니다.',
    src: '조코딩AX파트너스 블로그 2026-11-02 (검사 업체 자료)', url: 'https://jocodingax.ai/blog/prove-ai-skills-for-jobs',
  },
  {
    test: '국내 IT 기업 채용에 쓰인 AI 역량평가 AISA에서 점수가 낮은 응시자는 검증 없이 AI의 답변을 그대로 받아들였습니다.',
    here: '놓친 오류는 최종본에 빨갛게 남고, 성적표에 찾음·놓침·멀쩡한데 짚음을 따로 셉니다.',
    src: '전자신문 2026-09-01', url: 'https://m.etnews.com/20260901000167',
  },
];

const CONTEXT = [
  { text: '주요 대기업 25곳 가운데 8곳이 지원자의 AI 활용 경험·역량을 채용 평가에 반영합니다.', src: '이데일리 2026-08-31', url: 'https://v.daum.net/v/7EqzU9rNwv' },
  { text: '인사혁신처는 AI를 부적절하게 써서 만든 공무원 국외훈련 보고서 11건을 찾아 체재비의 4배를 환수하기로 했습니다.', src: '노컷뉴스 2026-05-22', url: 'https://v.daum.net/v/20260522120301939' },
];

export default function Home() {
  const [tasks, setTasks] = useState(null);
  const [err, setErr] = useState('');
  const records = myRecords.all();
  useEffect(() => { api.tasks().then((r) => setTasks(r.tasks)).catch((e) => setErr(e.message)); }, []);
  const mini = tasks?.find((t) => t.mini);
  const real = tasks?.filter((t) => !t.mini) ?? [];
  const done = new Set(records.map((r) => r.taskId));

  return (
    <main className="home">
      <section className="hero">
        <p className="hero-from">AI 신입 → 검수자: 당신</p>
        <h1>AI 신입이 써 온 보고서,<br />승인하시겠습니까?</h1>
        <p className="hero-lead">
          AI 신입이 실제 공공 자료로 보고서를 써 왔습니다. 몇 군데는 일부러 틀리게 썼습니다.
          원자료와 대조해 틀린 문장을 짚고, 승인할지 돌려보낼지 정하세요. 신입이 고쳐 오거나 근거를 들어 되묻고, 놓친 곳은 그대로 나갑니다.
        </p>
        <div className="hero-actions">
          {mini ? <a className="btn btn-primary" href={`#/t/${mini.id}`}>1분 맛보기</a> : <span className="muted">{err || '불러오는 중…'}</span>}
          <a className="btn" href="#tasks">실전 과제 보기</a>
        </div>
      </section>

      <section id="tasks" className="tasks">
        <h2>결재 대기</h2>
        {err && <p className="error">과제 목록을 불러오지 못했습니다: {err}</p>}
        <ul className="task-list">
          {real.map((t) => (
            <li key={t.id}>
              <a className="task-row" href={`#/t/${t.id}`}>
                <span className="task-title">{t.title}</span>
                <span className="task-meta">
                  {trackName(t.track)} · 원자료 {t.sourceChars.toLocaleString()}자 · 결과물 {t.sentences}문장 · {Math.round(t.timeLimitSec / 60)}분 · {t.publisher}
                </span>
                <span className="task-meta">
                  <Badge text={t.badge} /> 푼 횟수 {t.plays}{done.has(t.id) ? ' · 내가 검수함' : ''}
                </span>
              </a>
            </li>
          ))}
          {tasks && !real.length && <li className="muted">아직 실전 과제가 없습니다.</li>}
        </ul>
      </section>

      <section className="why">
        <h2>실제 검사가 보는 것, 여기서 하는 것</h2>
        <p className="muted">AI 역량 검사는 대개 프롬프트 설계, 결과 검증, 보완을 함께 봅니다. 여기서는 그 가운데 <b>결과 검증</b>만 떼어 연습합니다. 검사 문항은 공개되지 않아 같은 형식이라고 말하지는 않습니다.</p>
        <ol className="map">
          {MAP.map((m) => (
            <li key={m.url}>
              <div className="map-test"><span className="map-label">실제 검사</span>{m.test} <a href={m.url} target="_blank" rel="noreferrer">{m.src}</a></div>
              <div className="map-here"><span className="map-label">여기서</span>{m.here}</div>
            </li>
          ))}
        </ol>
        <ul className="context">
          {CONTEXT.map((w) => (
            <li key={w.url}>{w.text} <a href={w.url} target="_blank" rel="noreferrer">{w.src}</a></li>
          ))}
        </ul>
        <p className="muted">기업의 검사는 전형 때 한 번 치르고 끝납니다. 여기서는 미리 검수해 보고, 무엇을 놓쳤는지 돌려받습니다.</p>
      </section>

      {records.length > 0 && (
        <section className="mine">
          <h2>내 기록 <span className="muted">(이 브라우저에만 남습니다)</span></h2>
          <ul>
            {records.slice(0, 5).map((r) => (
              <li key={r.at}>{r.title} — 찾음 {r.found} · 놓침 {r.missed} · 잘못 짚음 {r.falseAlarms} · {r.decision}{r.decisionOk ? '(맞음)' : '(틀림)'}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
