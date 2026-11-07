import { useState } from 'react';
import { api } from '../api.js';

// 실제 공공 데이터 연동 확인용. 재생 시나리오의 판단에는 들어가지 않는다.
export default function LivePanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    setLoading(true); setErr(null);
    try { setData(await api.live()); } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };
  const toggle = () => { setOpen(!open); if (!open && !data) load(); };

  const W = data?.water;
  const lv = W?.levels ? Object.entries(W.levels).filter(([, v]) => v !== null) : [];
  return (
    <div className="live">
      <button className="btn wide live-toggle" aria-expanded={open} onClick={toggle}>
        {open ? '실시간 연동 닫기' : '실시간 연동 보기 (충청북도 실제 데이터)'}
      </button>
      {open && (
        <div className="live-body">
          <p className="hint">실제 공공 API에서 가져온 값입니다. 재생 중인 가상 시나리오의 판단에는 쓰지 않습니다.</p>
          {loading && <p className="muted">불러오는 중입니다</p>}
          {err && <p className="blocked">불러오지 못했습니다: {err}</p>}
          {data && (
            <>
              <section className="live-sec">
                <h4>하천 수위</h4>
                {W.ok ? (
                  <>
                    <p><strong>{W.station}</strong> {W.latest ? <>{W.latest.wl}m <span className="sid">({W.latest.t})</span></> : '최근 관측값 없음'}</p>
                    {lv.length > 0 && <p className="sid">기준 수위: {lv.map(([k, v]) => `${k} ${v}m`).join(', ')}</p>}
                  </>
                ) : <p className="blocked">{W.error}</p>}
                <p className="src">{W.source}</p>
              </section>
              <section className="live-sec">
                <h4>기상특보 (청주)</h4>
                {data.weather.ok ? (data.weather.items.length
                  ? <ul>{data.weather.items.map((x, i) => <li key={i}><span className="sid">{x.t}</span> {x.title}</li>)}</ul>
                  : <p className="muted">최근 5일 발표된 특보 없음</p>) : <p className="blocked">{data.weather.error}</p>}
                <p className="src">{data.weather.source}</p>
              </section>
              <section className="live-sec">
                <h4>긴급재난문자 ({data.sms.region})</h4>
                {data.sms.ok ? (data.sms.items.length
                  ? <ul>{data.sms.items.map((x, i) => <li key={i}><span className="sid">{x.t} {x.region} {x.step}</span><p className="body raw">{x.text}</p></li>)}</ul>
                  : <p className="muted">최근 6일 발송된 문자 없음</p>) : <p className="blocked">{data.sms.error}</p>}
                <p className="src">{data.sms.source}</p>
              </section>
              <div className="row">
                <button className="btn ghost small" onClick={load} disabled={loading}>다시 불러오기</button>
                <span className="sid">{new Date(data.at).toLocaleString('ko-KR')} 조회{data.cached ? ', 1분 캐시' : ''}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
