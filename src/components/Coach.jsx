// 연습 모드 안내. 시작 카드, 멈춘 순간의 짧은 안내, 마친 뒤 카드. 설명문이 아니라 「~해 보세요」 같은 조작 안내만 쓴다.
export function Intro({ script, onBegin, onSkip }) {
  return (
    <div className="modal-back">
      <div className="coach-intro" role="dialog" aria-modal="true" aria-labelledby="ci-h">
        <p className="kicker">연습, 약 {script.minutes}분</p>
        <h2 id="ci-h">{script.intro.title}</h2>
        <p>{script.intro.body}</p>
        <div className="row end">
          <button className="btn ghost" onClick={onSkip}>근무 화면으로</button>
          <button className="btn dark" onClick={onBegin} autoFocus>연습 시작</button>
        </div>
      </div>
    </div>
  );
}

export function CoachBar({ coach, step, total }) {
  if (!coach) return null;
  return (
    <div className="coach" role="status" aria-live="polite">
      <span className="coach-step">{step ? `연습 ${step}/${total}` : coach.expect === 'handover' ? '마무리' : '연습'}</span>
      <p>{coach.text}</p>
    </div>
  );
}

export function Finale({ session, onScatter, onLive, onAgain }) {
  const decisions = session.incidents.reduce((n, i) => n + i.decisions.length, 0);
  return (
    <div className="modal-back">
      <div className="coach-intro" role="dialog" aria-modal="true" aria-labelledby="cf-h">
        <p className="kicker">연습을 마쳤습니다</p>
        <h2 id="cf-h">신호 {session.signals.length}건을 사건 {session.incidents.length}개로 받고, {decisions}번 결정했습니다</h2>
        <p>같은 신호를 당직메이트 없이 받으면 어떤지 볼 수 있습니다. 실제 근무 화면에서는 받은 전화를 적으면 같은 과정을 거칩니다.</p>
        <div className="row end wrap">
          <button className="btn ghost" onClick={onAgain}>처음부터 다시</button>
          <button className="btn" onClick={onScatter}>당직메이트 없이 받았다면</button>
          <button className="btn dark" onClick={onLive} autoFocus>실제 근무로 돌아가기</button>
        </div>
      </div>
    </div>
  );
}
