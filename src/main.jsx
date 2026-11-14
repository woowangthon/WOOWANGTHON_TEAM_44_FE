import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// 움직임을 쓸 수 있을 때만 <html class="motion">. 없으면 모든 카드가 처음부터 제자리에 보인다
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) document.documentElement.classList.add('motion');

createRoot(document.getElementById('root')).render(<App />);
