// 상황판: 결정할 사건이 여러 곳에서 동시에 쌓일 때. 지도를 크게 펼치고, 아래에 결정할 사건을 나란히 둔다.
import { ACTION_KO, needList, sevColor } from '../util.js';
import SituationMap from './SituationMap.jsx';

export default function Overview({ r, focus, onPick }) {
  const needs = needList(r.session?.incidents);
  return (
    <section className="overview" aria-labelledby="ov-h">
      <div className="ov-head">
        <h1 id="ov-h">{needs.length ? `결정할 사건 ${needs.length}건` : '상황판'}</h1>
        <p className="sub">{needs.length >= 3 ? '여러 곳에서 동시에 올라왔습니다. 지도나 아래 카드에서 하나를 골라 결정하세요.' : '사건 장소와 위험도입니다. 점을 누르면 그 사건을 엽니다.'}</p>
      </div>
      <div className="ov-map"><SituationMap big scenario={r.scenario} session={r.session} pending={r.pending} focus={focus} onPick={onPick} /></div>
      {needs.length > 0 && (
        <div className="ov-cards">
          {needs.map((i) => (
            <button key={i.id} className="ov-card" style={{ '--c': sevColor(i.grade) }} onClick={() => onPick(i.id, true)}>
              <span className="t">#{i.no} {i.title}</span>
              <span className="g">{ACTION_KO[i.grade]} 권고</span>
              <span className="m">{i.grade_why.slice(0, 2).join(', ')}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
