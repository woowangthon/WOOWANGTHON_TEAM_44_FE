// 지도: 사건 장소에 위험도 색 점(숫자는 사건 번호). 처리한 사건은 속이 빈 점, 결정할 사건과 고른 사건에만 이름표.
// 위치는 시나리오의 지명 사전 좌표에서만 가져온다. 사전에 없는 장소는 찍지 않는다.
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { sevColor, incState } from '../util.js';

const TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const placesOf = (scenario, sig) => scenario.places.filter((p) => (sig?.norm?.place_ids ?? []).includes(p.id) && p.coord);

export default function SituationMap({ scenario, session, pending, focus, onPick, big, liveGauge }) {
  const box = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

  useEffect(() => {
    const m = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: !!big });
    L.tileLayer(TILE, { attribution: ATTR, maxZoom: 18 }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize({ animate: false }));
    ro.observe(box.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
  }, [big]);

  useEffect(() => {
    const m = map.current;
    const pts = scenario.places.filter((p) => p.coord && !p.dictionary_only).map((p) => p.coord);
    if (m && pts.length) m.fitBounds(L.latLngBounds(pts), { animate: false, padding: big ? [48, 48] : [20, 20] });
  }, [scenario.id, big]);

  useEffect(() => {
    const g = layer.current;
    if (!map.current || !g) return;
    g.clearLayers();
    const incs = session?.incidents ?? [];
    const sigs = session?.signals ?? [];
    for (const gg of scenario.gauges) {
      if (!gg.coord) continue;
      L.marker(gg.coord, {
        icon: L.divIcon({ className: 'map-gauge', html: `<span></span>${big ? `<em>${gg.name} 관측소</em>` : ''}`, iconSize: [12, 12], iconAnchor: [6, 6] }),
        title: `수위관측소 ${gg.name}`, keyboard: false,
      }).addTo(g);
    }
    // 사건마다 대표 장소 하나(첫 신호의 장소)에 점을 찍는다
    for (const inc of incs) {
      const sig = inc.signal_ids.map((sid) => sigs.find((x) => x.id === sid)).find((s) => placesOf(scenario, s).length);
      const p = sig && placesOf(scenario, sig)[0];
      if (!p) continue;
      const st = incState(inc);
      const c = sevColor(inc.grade);
      const on = inc.id === focus;
      const label = on || st === 'need' || big;
      const r = on ? 14 : 11;
      const html = `<span class="pin s-${st} ${on ? 'on' : ''}" style="--c:${c};width:${r * 2}px;height:${r * 2}px">${inc.no}</span>`
        + (label ? `<span class="lbl ${on ? 'on' : ''}">${p.name}</span>` : '');
      const mk = L.marker(p.coord, {
        icon: L.divIcon({ className: 'map-pin', html, iconSize: [r * 2, r * 2], iconAnchor: [r, r] }),
        title: `사건 #${inc.no} ${inc.title}`, riseOnHover: true, zIndexOffset: on ? 1000 : st === 'need' ? 500 : 0,
      }).addTo(g);
      mk.on('click', () => onPick?.(inc.id));
    }
    if (pending) {
      const hit = scenario.places.find((p) => p.coord && [p.name, ...(p.aliases ?? [])].some((a) => pending.body.includes(a)));
      if (hit) {
        L.marker(hit.coord, { icon: L.divIcon({ className: 'map-reading', html: '<span></span>', iconSize: [44, 44], iconAnchor: [22, 22] }), interactive: false, zIndexOffset: 2000 }).addTo(g);
      }
    }
  }, [scenario, session, pending, focus, onPick, big, liveGauge]);

  return <div className={`map ${big ? 'big' : ''}`} ref={box} role="img" aria-label="사건 장소 지도" />;
}
