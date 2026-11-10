// 충북 실시간 자료: 실제 공공 API 값. 열면 바로 불러오고, 1분 캐시를 쓴다.
import { useEffect, useState } from 'react';
import { api } from '../api.js';

const short = (t) => { const m = String(t).match(/(\d{4})[-/](\d{2})[-/](\d{2})\s+(\d{2}):(\d{2})/); return m ? `${+m[2]}월 ${+m[3]}일 ${m[4]}:${m[5]}` : t; };

export default function LiveData() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(null);
  const load = () => api.live().then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); const id = setInterval(load, 5 * 60e3); return () => clearInterval(id); }, []);
  if (err && !d) return <p className="blocked">실시간 자료를 불러오지 못했습니다: {err}</p>;
  if (!d) return <p className="muted">충북 실시간 자료를 불러오는 중입니다</p>;
  const W = d.water;
  const lv = W.ok && W.levels ? W.levels : {};
  const top = lv.심각 ?? lv.계획홍수위 ?? 10;
  const tick = (k) => lv[k] != null && <span style={{ left: `${(lv[k] / top) * 100}%` }}>{k} {lv[k]}</span>;
  return (
    <div className="live">
      <section>
        <h4>{W.ok ? W.station.replace(/^청주시\(|\)$/g, '') : '하천'} 수위</h4>
        {W.ok && W.latest ? (
          <>
            <p className="lv"><b>{W.latest.wl.toFixed(2)}m</b><span>{W.latest.t.slice(11)} 관측{lv.관심 != null ? `, 관심 수위 ${lv.관심}m까지 ${(lv.관심 - W.latest.wl).toFixed(2)}m` : ''}</span></p>
            <div className="bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (W.latest.wl / top) * 100)}%` }} /></div>
            <div className="ticks" aria-hidden="true">{tick('관심')}{tick('주의')}{tick('경계')}</div>
          </>
        ) : <p className="blocked">{W.error ?? '최근 관측값 없음'}</p>}
        <p className="srcl">한강홍수통제소 수위 Open API</p>
      </section>
      <section>
        <h4>기상특보, 청주</h4>
        {d.weather.ok ? (
          <p className="item">{/발표|발효/.test(d.weather.items[0]?.title ?? '') && !/해제/.test(d.weather.items[0]?.title) ? d.weather.items[0].title.replace(/^\[특보\]\s*/, '') : '발효 중인 특보가 없습니다.'}
            {d.weather.items[0] && <time>{short(d.weather.items[0].t)} {d.weather.items[0].title.split('/').at(-1).replace(/\(\*\)/, '').trim()}</time>}</p>
        ) : <p className="blocked">{d.weather.error}</p>}
        <p className="srcl">기상청 기상특보 조회서비스</p>
      </section>
      <section>
        <h4>재난문자, 충북</h4>
        {d.sms.ok ? (d.sms.items.length ? d.sms.items.slice(0, 2).map((x, i) => (
          <p key={i} className="item"><time>{short(x.t)} {x.region.replace('충청북도 ', '').trim()}</time>{x.text}</p>
        )) : <p className="muted">최근 6일 동안 발송된 문자가 없습니다.</p>) : <p className="blocked">{d.sms.error}</p>}
        <p className="srcl">행정안전부 긴급재난문자, 원문 그대로</p>
      </section>
    </div>
  );
}
