import { fmt } from '../util.js';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
function dateLabel(iso) {
  const d = new Date(`${iso}T12:00:00+09:00`);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${DAYS[d.getUTCDay()]}요일`;
}
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const VIEWS = [['auto', '지금 할 일'], ['overview', '상황판'], ['night', '근무 기록']];

export default function Header({ r, view, pinned, setPinned, onReport, onPractice, onLive, onLogout }) {
  const scn = r.scenario;
  const short = scn.id.startsWith('osong') ? '오송' : '청주';
  return (
    <header className="top">
      <span className="wm">당직메이트</span>
      <span className="office">{r.kind === 'live' ? '청주시청 당직실, 야간 당직' : scn.duty.office}</span>
      {r.kind === 'practice' && (
        <details className="tag">
          <summary>연습, {scn.clock.date.replace(/-/g, '.')} {short} 기록 재구성, 실제 발송 없음</summary>
          <div className="pop">
            <p>{scn.disclaimer}</p>
            {scn.sources?.length > 0 && <p className="sub">출처: {scn.sources.join(', ')}</p>}
            <p className="sub">AI는 어떤 조치도 실행하지 않습니다. 이 화면에서는 실제 전화나 문자를 보내지 않습니다.</p>
          </div>
        </details>
      )}
      {r.kind === 'record' && <span className="tag static">저장된 연습 기록({r.meta?.saved?.slice(5).replace('-', '/')}), 결정은 시연 스크립트가 입력</span>}
      <span className="sp" />
      <nav className="views" aria-label="화면">
        {VIEWS.map(([k, l]) => (
          <button key={k} className={(pinned === k || (k === 'auto' && (!pinned || pinned === 'auto'))) ? 'on' : ''} aria-pressed={pinned === k} onClick={() => setPinned(k)}>
            {l}
          </button>
        ))}
      </nav>
      <div className="now" aria-live="off">
        <b>{fmt(r.clock)}</b>
        <span>{dateLabel(r.kind === 'live' ? today() : scn.clock.date)}</span>
      </div>
      <button className="btn" onClick={onReport} disabled={!r.session?.signals.length || !!r.busy}>인계 보고서</button>
      <details className="menu">
        <summary aria-label="메뉴">메뉴</summary>
        <div className="pop right">
          {r.kind !== 'live' && <button onClick={onLive}>실제 근무로 돌아가기</button>}
          <button onClick={onPractice}>연습하기</button>
          {r.kind === 'practice' && <button onClick={() => r.restartPractice?.()}>이 연습 처음부터</button>}
          <button onClick={onLogout}>로그아웃</button>
        </div>
      </details>
    </header>
  );
}
