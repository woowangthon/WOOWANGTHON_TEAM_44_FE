import { BRAND } from '../brand.js';

export function Header({ maker }) {
  return (
    <header className="top">
      <a className="brand" href="#/">
        <span className="brand-name">{BRAND.name}</span>
        <span className="brand-sub">{BRAND.sub}</span>
      </a>
      <nav className="top-nav">
        <a href="#/">과제 목록</a>
        <a href="#/about">만든 방법과 근거</a>
        {maker && <span className="maker-tag" title="이 브라우저의 플레이는 만든 사람 기록으로 따로 셉니다">만든 사람 모드</span>}
      </nav>
    </header>
  );
}

const STEPS = ['검수', '판정', '신입의 답', '성적표'];

/** 진행 단계는 화면 위에 늘 둔다(영상만 보고도 어디인지 알 수 있게) */
export function Stepper({ at }) {
  return (
    <ol className="stepper" aria-label="진행 단계">
      {STEPS.map((s, i) => (
        <li key={s} className={i === at ? 'now' : i < at ? 'done' : ''} aria-current={i === at ? 'step' : undefined}>
          <span className="step-no" aria-hidden="true">{i < at ? '✓' : i + 1}</span> {s}{i < at ? <span className="sr-only"> (끝남)</span> : null}
        </li>
      ))}
    </ol>
  );
}

export function Badge({ text }) {
  if (!text) return null;
  const live = text.startsWith('방금');
  return <span className={`badge ${live ? 'badge-live' : ''}`}>{text}</span>;
}

/** 결과물 위에 늘 두는 알림 */
export function PracticeNotice({ url }) {
  return (
    <p className="notice">
      연습용으로 일부를 일부러 틀리게 쓴 요약입니다. 원문은 <a href={url} target="_blank" rel="noreferrer">링크</a>에서 확인하세요.
    </p>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <p>이름 없이 기록합니다. 이 브라우저가 만든 무작위 번호로 같은 과제의 첫 판만 집계에 넣습니다.</p>
      <p>원자료는 공공누리 제1유형(출처표시) 공공 자료의 텍스트이고, 과제마다 출처를 밝힙니다.</p>
    </footer>
  );
}

export const trackName = (t) => ({ document: '문서', table: '표', code: '코드' }[t] ?? t);
