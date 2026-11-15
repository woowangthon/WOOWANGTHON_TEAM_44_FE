import { useEffect, useState } from 'react';
import { isMaker } from './api.js';
import { Header, Footer } from './ui/parts.jsx';
import Home from './screens/Home.jsx';
import RunView from './screens/RunView.jsx';
import Review from './screens/Review.jsx';
import Placeholder from './screens/Placeholder.jsx';
import Lead from './screens/Lead.jsx';
import Patterns from './screens/Patterns.jsx';
import Me from './screens/Me.jsx';
import About from './screens/About.jsx';
import Drill from './screens/Drill.jsx';
import Account from './screens/Account.jsx';

// 주소: #/ 오늘의 연습, #/drill 짧은 연습, #/mock 모의 문제집, #/account 기록 보관(기록 코드·선택 계정), #/r/<판> 사수 모드, #/lead/<미션> 팀장 모드, #/patterns 습관 도감, #/me 내 실력, #/about 만든 방법과 검증, #/review[/<판>] 만든 사람 검수
const ID = '([a-z0-9][a-z0-9.-]+)';
const parse = () => {
  const h = location.hash.replace(/^#/, '') || '/';
  let m;
  if ((m = h.match(new RegExp(`^/r/${ID}`)))) return { page: 'run', id: m[1] };
  if ((m = h.match(new RegExp(`^/lead/${ID}`)))) return { page: 'lead', id: m[1] };
  if ((m = h.match(new RegExp(`^/review/${ID}`)))) return { page: 'review', id: m[1] };
  if (h.startsWith('/review')) return { page: 'review' };
  if (h.startsWith('/patterns')) return { page: 'patterns' };
  if (h.startsWith('/about')) return { page: 'about' };
  if (h.startsWith('/me')) return { page: 'me' };
  if (h.startsWith('/drill')) return { page: 'drill' };
  if (h.startsWith('/mock')) return { page: 'mock' };
  if (h.startsWith('/account')) return { page: 'account' };
  return { page: 'home' };
};

export default function App() {
  const [route, setRoute] = useState(parse);
  const [maker] = useState(isMaker);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  // 문서 제목은 index.html(공유 미리보기 og:title과 같은 첫 화면 질문)을 그대로 쓴다
  const page = {
    run: <RunView key={route.id} id={route.id} />,
    review: <Review key={route.id ?? 'q'} runId={route.id} />,
    lead: <Lead key={route.id} missionId={route.id} />,
    patterns: <Patterns />,
    me: <Me />,
    about: <About />,
    drill: <Drill key="daily" />,
    mock: <Drill key="mock" mode="mock" />,
    account: <Account />,
  }[route.page] ?? <Home />;
  return (<><Header maker={maker} page={route.page} />{page}<Footer /></>);
}
