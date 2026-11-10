// 로그인 직후, 처음 온 사람에게 연습을 권한다(게임 튜토리얼처럼). 메뉴의 「연습하기」로 언제든 다시 연다.
import { useEffect, useState } from 'react';
import { api } from '../api.js';

const when = (s) => { const [y, m, d] = s.clock.date.split('-').map(Number); return `${y}년 ${m}월 ${d}일`; };
const place = (s) => (s.id.startsWith('osong') ? '오송' : s.id.startsWith('cheongju') ? '청주' : s.title);

export default function Welcome({ first, onPractice, onClose }) {
  const [list, setList] = useState([]);
  useEffect(() => { api.scenarios().then((xs) => setList(xs.filter((s) => !s.live && s.signals > 0))).catch(() => {}); }, []);
  const order = [...list].sort((a, b) => (a.id.startsWith('cheongju') ? -1 : 1) - (b.id.startsWith('cheongju') ? -1 : 1));
  return (
    <div className="modal-back">
      <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="wel-h">
        <h2 id="wel-h">{first ? '처음이신가요?' : '연습하기'}</h2>
        <p>지난 호우 기록으로 재구성한 새벽을 직접 겪어 봅니다. 신호가 흐르다가 연습할 순간에 멈추면, 근거를 보고 결정하고 전화를 받아 적어 봅니다. 실제 전화나 문자는 보내지 않습니다.</p>
        <div className="choices">
          {order.map((s) => (
            <button key={s.id} className="choice" onClick={() => onPractice(s.id)}>
              <b>{when(s)} 새벽, {place(s)}</b>
              <span>{s.clock.start}~{s.clock.end}, 신호 {s.signals}건{s.basis === 'record' && s.id.startsWith('cheongju') ? ', 보도와 실측 수위 기반' : ', 공식 기록 기반'}</span>
            </button>
          ))}
        </div>
        <button className="link" onClick={onClose}>{first ? '연습하지 않고 근무 화면으로' : '닫기'}</button>
      </div>
    </div>
  );
}
