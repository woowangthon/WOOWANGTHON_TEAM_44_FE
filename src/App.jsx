import { useEffect, useState } from 'react';
import { isMaker } from './api.js';
import { BRAND } from './brand.js';
import { Header, Footer } from './ui/parts.jsx';
import Home from './screens/Home.jsx';
import Play from './screens/Play.jsx';
import About from './screens/About.jsx';

// 주소: #/ 첫 화면, #/t/<과제 id> 과제, #/about 만든 방법과 근거
const parse = () => {
  const h = location.hash.replace(/^#/, '') || '/';
  const m = h.match(/^\/t\/([a-z0-9-]+)/);
  if (m) return { page: 'play', id: m[1] };
  if (h.startsWith('/about')) return { page: 'about' };
  return { page: 'home' };
};

export default function App() {
  const [route, setRoute] = useState(parse);
  const [maker] = useState(isMaker);
  useEffect(() => {
    const on = () => { setRoute(parse()); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => { document.title = `${BRAND.name} · ${BRAND.sub}`; }, []);

  return (
    <>
      <Header maker={maker} />
      {route.page === 'play' ? <Play id={route.id} /> : route.page === 'about' ? <About /> : <Home />}
      <Footer />
    </>
  );
}
