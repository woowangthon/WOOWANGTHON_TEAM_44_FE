import { useEffect, useRef } from 'react';

// 들어오는 카드(parkmiyeong.com의 Slide를 가져옴). 화면 아래쪽 86% 선을 넘으면 정해진 쪽에서 짧게 밀려 들어오고,
// 되감아서 그 선 아래로 다시 내려가면 같은 쪽으로 빠진다. 위로 지나간 카드는 그대로 둔다.
// 방향은 카드가 놓이는 자리에서 가장 가까운 가장자리. from: 기본(휴대폰) · fromSm: 640px 이상 · fromLg: 1024px 이상. 'left' | 'right' | 'up'
// 움직임 줄이기 설정이거나 IntersectionObserver가 없으면 <html>에 .motion이 붙지 않아 그냥 보인다(main.jsx).
// 테두리 있는 상자에만 쓴다. 글(제목·문단)과 일하는 화면(작업·짧은 연습·검수·팀장 모드)은 움직이지 않는다.
export default function Slide({ as: Tag = 'div', from = 'left', fromSm, fromLg, delay = 0, style, children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !document.documentElement.classList.contains('motion')) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting || e.boundingClientRect.top < 0) el.classList.add('in');
      else el.classList.remove('in');
    }, { rootMargin: '0px 0px -14% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} data-slide={from} data-slide-sm={fromSm} data-slide-lg={fromLg} style={delay ? { ...style, '--slide-delay': `${delay}ms` } : style} {...rest}>
      {children}
    </Tag>
  );
}
