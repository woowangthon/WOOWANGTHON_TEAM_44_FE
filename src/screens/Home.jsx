import { useEffect, useState } from 'react';
import { api, doneIds } from '../api.js';
import { Badge, trackName } from '../ui/parts.jsx';
import { Stamp, PenNote, docNo } from '../ui/doc.jsx';

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
  { text: '취업 준비생이 새 형식의 AI 활용 평가를 연습할 자료를 찾다가 예전 AI역검(게임·영상면접) 자료만 나와, 「AI가 쓴 초안에서 틀린 부분 찾기」 같은 문제를 직접 만들어 나눴습니다(커뮤니티 글 하나라 대표성은 없습니다).', src: '링커리어 커뮤니티 2026-11-10', url: 'https://community.linkareer.com/jayuu/6724511' },
  { text: '인사혁신처는 AI를 부적절하게 써서 만든 공무원 국외훈련 보고서 11건을 찾아 체재비의 4배를 환수하기로 했습니다.', src: '노컷뉴스 2026-05-22', url: 'https://v.daum.net/v/20260522120301939' },
];

export default function Home() {
  const [tasks, setTasks] = useState(null);
  const [err, setErr] = useState('');
  const done = doneIds();
  useEffect(() => { api.tasks().then((r) => setTasks(r.tasks)).catch((e) => setErr(e.message)); }, []);
  const mini = tasks?.find((t) => t.mini);
  const real = tasks?.filter((t) => !t.mini) ?? [];

  return (
    <main className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">공채 AI 활용 평가 대비 · 결과물 검수 연습</p>
          <h1>AI 신입이 올린 보고서,<br />결재하시겠습니까?</h1>
          <p className="hero-lead">
            입사하면 AI가 쓴 초안을 원자료와 대조해 확인하는 일이 곧 신입의 일입니다. 여기서는 당신이 사수입니다.
            AI 신입이 실제 공공 자료로 쓴 보고서에서 틀린 문장에 빨간 줄을 긋고, 승인하거나 반려하세요.
          </p>
          <p className="hero-lead muted">
            틀린 곳은 있을 수도, 없을 수도 있습니다. 반려하면 신입이 고쳐서 다시 올리고, 끝까지 놓친 문장은 틀린 채 팀장에게 올라갑니다.
          </p>
          <div className="hero-actions">
            {mini ? <a className="btn btn-primary" href={`#/t/${mini.id}`}>1분 맛보기</a> : <span className="muted">{err || '불러오는 중…'}</span>}
            <a className="btn" href="#/new">AI 신입에게 새 보고서 받기</a>
          </div>
        </div>
        <HeroDoc />
      </section>

      <section id="tasks" className="inbox">
        <div className="inbox-head">
          <h2>결재함</h2>
          <span className="muted small">{real.length ? `미결 ${real.filter((t) => !done.has(t.id)).length}건 · 결재함 ${real.filter((t) => done.has(t.id)).length}건` : ''}</span>
        </div>
        {err && <p className="error">결재함을 불러오지 못했습니다: {err}</p>}
        <table className="inbox-table">
          <thead><tr><th>문서번호</th><th>제목</th><th className="hide-sm">기안</th><th className="hide-sm">첨부</th><th>기한</th><th>상태</th></tr></thead>
          <tbody>
            {real.map((t) => (
              <tr key={t.id} className={done.has(t.id) ? 'is-done' : ''}>
                <td className="mono">{docNo(t.id)}</td>
                <td>
                  <a href={`#/t/${t.id}`} className="inbox-link">{t.title}</a>
                  <span className="inbox-sub">{trackName(t.track)} · {t.publisher} · <Badge text={t.badge} />{t.plays ? ` · 검토한 사람 ${t.plays}명` : ''}</span>
                </td>
                <td className="hide-sm">AI 신입</td>
                <td className="hide-sm">원자료 {t.sourceChars.toLocaleString()}자</td>
                <td>{Math.round(t.timeLimitSec / 60)}분</td>
                <td>{done.has(t.id) ? <span className="state done">결재함</span> : <span className="state">미결</span>}</td>
              </tr>
            ))}
            {tasks && !real.length && <tr><td colSpan={6} className="muted">아직 올라온 문서가 없습니다.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="why chatbot">
        <h2>챗봇에게 「틀린 곳 넣어서 문제 내 줘」 하면 되지 않나요?</h2>
        <p>
          그렇게 만든 문제는 정답지부터 틀릴 수 있습니다. 넣었다는 오류가 사실은 맞는 문장이거나, 넣지 않은 곳에 오류가 섞여 있어도 확인할 방법이 없습니다.
          Redline은 보고서를 쓰는 AI와 검증하는 장치를 나눴습니다.
        </p>
        <ol className="flow">
          <li><b>작성</b><span>AI 신입(Claude Opus)이 문장마다 원자료 인용을 달아 씁니다</span></li>
          <li><b>대조</b><span>코드가 인용과 숫자를 원자료와 글자 그대로 맞춰 봅니다</span></li>
          <li><b>오류 심기</b><span>숫자·단위·방향은 코드가, 없는 주장·단정은 AI가 넣습니다</span></li>
          <li><b>교차 판정</b><span>작성과 다른 점검 모델(Claude Sonnet)이 틀렸다고 판정한 곳만 남깁니다</span></li>
          <li><b>눈 가린 풀이</b><span>점검 모델이 사용자와 같은 화면만 보고 먼저 풀어 봅니다</span></li>
          <li><b>채점·답장</b><span>모델을 부르지 않고 코드가 합니다. 멀쩡한 문장을 짚으면 원자료 인용으로 돌려줍니다</span></li>
        </ol>
        <p className="muted small">결재함의 문서는 이 과정을 미리 거쳤고, 일부는 사람이 한 번 더 대조했습니다. 「새 보고서 받기」를 누르면 같은 과정이 지금 화면에서 돌아갑니다. 같은 문서를 처음 결재한 사람들 가운데 몇 %가 찾았는지도 함께 보여 줍니다.</p>
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
        <h3>연습할 곳</h3>
        <ul className="context">
          {CONTEXT.map((w) => (
            <li key={w.url}>{w.text} <a href={w.url} target="_blank" rel="noreferrer">{w.src}</a></li>
          ))}
        </ul>
        <p className="muted">기업의 검사는 전형 때 한 번 치르고 끝납니다. 여기서는 미리 결재해 보고, 무엇을 놓쳤는지 돌려받습니다.</p>
      </section>
    </main>
  );
}

/** 첫 화면 오른쪽의 견본 문서(장식). 실제 과제와 같은 모양으로 무엇을 하는 곳인지 보여 준다 */
function HeroDoc() {
  return (
    <div className="hero-doc" aria-hidden="true">
      <div className="sheet doc mini-doc">
        <div className="mini-head">
          <div>
            <p className="doc-no">견본 문서</p>
            <p className="mini-title">도서관 운영 개편 요약</p>
          </div>
          <table className="approval"><thead><tr><th>기안</th><th>검토</th></tr></thead>
            <tbody><tr><td><Stamp kind="sign" label="AI 신입" small /></td><td><Stamp kind="no" label="반려" small /></td></tr></tbody></table>
        </div>
        <ol className="lines">
          <li><span className="line static"><span className="l-no">1.</span><span className="l-text"><span className="ink">시립도서관은 다음 달부터 평일 운영을 밤 10시까지 늘린다.</span></span><span className="l-margin" /></span></li>
          <li className="marked"><span className="line static"><span className="l-no">2.</span><span className="l-text"><span className="ink">열람실 이용자는 지난해보다 12% 감소했다.</span></span><span className="l-margin"><PenNote>원자료는 증가!</PenNote></span></span></li>
          <li><span className="line static"><span className="l-no">3.</span><span className="l-text"><span className="ink">주말 운영 시간은 그대로 유지할 계획이다.</span></span><span className="l-margin" /></span></li>
        </ol>
      </div>
    </div>
  );
}
