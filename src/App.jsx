import { useEffect, useState } from 'react';
import { isMaker } from './api.js';
import { BRAND } from './brand.js';
import { Header, Footer } from './ui/parts.jsx';
import Home from './screens/Home.jsx';
import Play from './screens/Play.jsx';
import About from './screens/About.jsx';
import Live from './screens/Live.jsx';
import Records from './screens/Records.jsx';
import Exam from './screens/Exam.jsx';

// 주소: #/ 결재함, #/t/<과제 id> 결재, #/new 새 보고서 받기, #/me 내 기록, #/exam 모의 검사, #/about 만든 방법과 근거
const parse = () => {
  const h = location.hash.replace(/^#/, '') || '/';
  const m = h.match(/^\/t\/([a-z0-9-]+)/);
  if (m) return { page: 'play', id: m[1] };
  if (h.startsWith('/about')) return { page: 'about' };
  if (h.startsWith('/new')) return { page: 'new' };
  if (h.startsWith('/me')) return { page: 'me' };
  if (h.startsWith('/exam')) return { page: 'exam' };
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
  useEffect(() => { document.title = `${BRAND.name} · ${BRAND.sub}`; }, []);

  const page = {
    play: <Play id={route.id} />, about: <About />, new: <Live />, me: <Records />, exam: <Exam />,
  }[route.page] ?? <Home />;
  return (
    <>
      <Header maker={maker} page={route.page} />
      {page}
      <Footer />
    </>
  );
}
