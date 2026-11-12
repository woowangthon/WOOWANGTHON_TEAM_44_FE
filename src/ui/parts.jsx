import { BRAND } from '../brand.js';

export function Header({ maker, page }) {
  const cur = (p) => (page === p ? 'page' : undefined);
  return (
    <header className="top">
      <a className="brand" href="#/" aria-label={`${BRAND.name} 첫 화면`}>
        <span className="brand-name">{BRAND.name}</span>
        <span className="brand-sub">{BRAND.sub}</span>
      </a>
      <nav className="top-nav" aria-label="주 메뉴">
        <a href="#/" aria-current={cur('home')}>미션</a>
        <a href="#/patterns" aria-current={cur('patterns')}>실패 패턴</a>
        <a href="#/me" aria-current={cur('me')}>내 기록</a>
        <a href="#/about" aria-current={cur('about')}>만든 방법과 검증</a>
        {maker && <a href="#/review" aria-current={cur('review')}>검수</a>}
        {maker && <span className="maker-tag" title="이 브라우저의 기록은 만든 사람 기록으로 따로 셉니다">만든 사람 모드</span>}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <p>이름 없이 기록합니다. 이 브라우저가 만든 무작위 번호로 같은 판의 첫 풀이만 집계에 넣고, 만든 사람의 기록은 따로 셉니다.</p>
      <p>원자료는 공공누리 제1유형(출처표시) 정책브리핑 보도자료의 텍스트이고, 판마다 출처를 밝힙니다. AI 결과물은 손대지 않았습니다.</p>
    </footer>
  );
}
