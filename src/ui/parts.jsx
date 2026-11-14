import { useRef } from 'react';
import { BRAND } from '../brand.js';

// 만든 사람 도구(검수)는 메뉴에 두지 않는다. 주소 #/review 로 들어가거나, 만든 사람 기기(?maker=1로 한 번 들어온 브라우저)에서 로고를 1.5초 안에 다섯 번 누르면 열린다
export function Header({ maker, page }) {
  const cur = (p) => (page === p ? 'page' : undefined);
  const taps = useRef([]);
  const onBrand = (e) => {
    if (!maker) return;
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 1500), now];
    if (taps.current.length >= 5) { e.preventDefault(); taps.current = []; location.hash = '#/review'; }
  };
  return (
    <header className="top">
      <a className="brand" href="#/" aria-label={`${BRAND.name} 첫 화면`} onClick={onBrand}>
        <span className="brand-name">{BRAND.name}</span>
        <span className="brand-sub">{BRAND.sub}</span>
      </a>
      <nav className="top-nav" aria-label="주 메뉴">
        <a href="#/" aria-current={cur('home')}>오늘의 연습</a>
        <a href="#/drill" aria-current={cur('drill')}>짧은 연습</a>
        <a href="#/patterns" aria-current={cur('patterns')}>습관 도감</a>
        <a href="#/me" aria-current={cur('me')}>내 실력</a>
        <a href="#/about" aria-current={cur('about')}>만든 방법과 검증</a>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <p>이름 없이 기록합니다. 이 브라우저가 만든 무작위 번호로 같은 판의 첫 풀이만 집계에 넣고, 만든 사람의 기록은 따로 셉니다. 어느 원자료 문단이 화면에 보였는지는 그 판의 결과 피드백에만 씁니다.</p>
      <p>원자료는 공공누리 제1유형(출처표시) 정책브리핑 보도자료의 텍스트이고, 판마다 출처를 밝힙니다. AI 결과물은 손대지 않았습니다.</p>
    </footer>
  );
}
