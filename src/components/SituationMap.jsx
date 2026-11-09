// 상황판 지도: 신호가 들어온 장소에 점을 찍고, 같은 사건이면 같은 색으로 묶어 보여 준다.
// 위치는 시나리오의 지명 사전 좌표(places[].coord)에서만 가져온다. 사전에 없는 장소는 지도에 찍지 않는다.
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { incColor } from '../util.js';

const TILE = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function placesOf(scenario, sig) {
  const ids = sig.norm?.place_ids ?? [];
  return scenario.places.filter((p) => ids.includes(p.id) && p.coord);
}

export default function SituationMap({ scenario, session, pending, focus, onPick }) {
  const box = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);

  useEffect(() => {
    const m = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    L.tileLayer(TILE, { attribution: ATTR, subdomains: 'abcd', maxZoom: 18 }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  // 지도 범위: 시나리오 지명 전체
  useEffect(() => {
    const m = map.current;
    const pts = scenario.places.filter((p) => p.coord && !p.dictionary_only).map((p) => p.coord);
    if (m && pts.length) m.fitBounds(L.latLngBounds(pts), { animate: false, paddingTopLeft: [24, 24], paddingBottomRight: [96, 24] });
  }, [scenario.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const incs = session?.incidents ?? [];
    const no = Object.fromEntries(incs.map((i) => [i.id, i.no]));
    const sigs = session?.signals ?? [];
    const lastId = sigs.at(-1)?.id;

    // 수위관측소: 작은 파란 마름모(이름은 마우스를 올리면 보인다)
    for (const gg of scenario.gauges) {
      if (!gg.coord) continue;
      L.marker(gg.coord, {
        icon: L.divIcon({ className: 'map-gauge-ico', html: '<span></span>', iconSize: [14, 14], iconAnchor: [7, 7] }),
        title: `수위관측소 ${gg.name}`, keyboard: false,
      }).addTo(g);
    }

    // 장소별로 신호를 모은다
    const byPlace = new Map();
    for (const s of sigs) {
      for (const p of placesOf(scenario, s)) {
        const e = byPlace.get(p.id) ?? { p, sigs: [] };
        e.sigs.push(s);
        byPlace.set(p.id, e);
      }
    }
    // 사건별 연결선: 같은 사건의 장소들을 이어 「하나로 묶였다」를 보여 준다
    for (const inc of incs) {
      const pts = [...new Set(inc.signal_ids.flatMap((sid) => placesOf(scenario, sigs.find((x) => x.id === sid) ?? {}).map((p) => p.id)))]
        .map((id) => scenario.places.find((p) => p.id === id).coord);
      if (pts.length > 1) {
        L.polyline(pts, { color: incColor(inc.no), weight: 3, opacity: 0.55, dashArray: '6 6', interactive: false }).addTo(g);
      }
    }
    for (const { p, sigs: xs } of byPlace.values()) {
      const incId = xs.map((s) => s.incident_id).filter(Boolean).at(-1);
      const inc = incs.find((i) => i.id === incId);
      const color = inc ? incColor(inc.no) : '#7b8794';
      const fresh = xs.some((s) => s.id === lastId);
      const r = 10 + Math.min(8, xs.length * 1.5);
      // 이름표는 겹치지 않게 보고 권고 이상이거나 선택한 사건, 방금 신호가 온 곳만 단다
      const showLabel = inc && (inc.id === focus || fresh || inc.grade !== 'observe');
      const html = `<span class="dot ${fresh ? 'fresh' : ''} ${inc && inc.id === focus ? 'focus' : ''}" style="--c:${color};width:${r * 2}px;height:${r * 2}px">${inc ? no[inc.id] : ''}</span>`
        + (showLabel ? `<span class="lbl ${inc.id === focus ? 'focus' : ''}" style="--c:${color}">${p.name}</span>` : '');
      const mk = L.marker(p.coord, {
        icon: L.divIcon({ className: 'map-pin', html, iconSize: [r * 2, r * 2], iconAnchor: [r, r] }),
        title: `${inc ? `사건 #${no[inc.id]} ` : ''}${p.name}: 신호 ${xs.length}건`, riseOnHover: true, zIndexOffset: fresh ? 1000 : 0,
      }).addTo(g);
      if (inc) mk.on('click', () => onPick(inc.id));
    }
    // AI가 지금 읽는 신호: 사전에 있는 지명이 본문에 보이면 그 자리를 깜빡인다
    if (pending) {
      const hit = scenario.places.find((p) => p.coord && [p.name, ...(p.aliases ?? [])].some((a) => pending.body.includes(a)));
      if (hit) {
        L.marker(hit.coord, {
          icon: L.divIcon({ className: 'map-reading', html: '<span></span>', iconSize: [44, 44], iconAnchor: [22, 22] }),
          interactive: false, zIndexOffset: 2000,
        }).addTo(g);
      }
    }
  }, [scenario, session, pending, focus, onPick]);

  return (
    <div className="map-wrap">
      <div className="map" ref={box} role="img" aria-label="신호가 들어온 장소 지도" />
      <p className="map-note">점 안의 숫자는 사건 번호, 점 크기는 그 장소의 신호 수입니다. 같은 색은 같은 사건으로 묶인 신호입니다.</p>
    </div>
  );
}
