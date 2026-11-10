const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* */ } },
  json(k) { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } },
};
export { store };

// 로그인 정보: { kind: 'code' | 'guest', code? }. 이 브라우저에 한 번 저장하고 다시 묻지 않는다.
export const auth = {
  get: () => store.json('dm:auth'),
  set: (a) => store.set('dm:auth', JSON.stringify(a)),
  clear: () => store.del('dm:auth'),
};

export class NeedCode extends Error {}
export class CapReached extends Error {}

async function req(path, body) {
  const headers = { 'content-type': 'application/json' };
  const a = auth.get();
  if (a?.code) headers['x-demo-code'] = a.code;
  const r = await fetch(`${BASE}${path}`, body ? { method: 'POST', headers, body: JSON.stringify(body) } : { headers });
  const j = await r.json().catch(() => ({ error: `서버 응답을 읽지 못했습니다(${r.status})` }));
  if (r.status === 401 && j.need_code) throw new NeedCode(j.error);
  if (r.status === 429 && j.cap) throw new CapReached('오늘 AI 체험 한도를 다 썼습니다');
  if (!r.ok) throw Object.assign(new Error(j.error || `요청 실패(${r.status})`), { status: r.status });
  return j;
}

export const api = {
  access: () => req('/api/access'),
  login: (code) => fetch(`${BASE}/api/access`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-demo-code': code }, body: JSON.stringify({ code }) }).then((r) => r.ok),
  scenarios: () => req('/api/scenarios'),
  scenario: (id) => req(`/api/scenarios?id=${encodeURIComponent(id)}`),
  session: (body) => req('/api/session', body),
  live: () => req('/api/live'),
  inbox: (q) => req(`/api/handoff?${new URLSearchParams(q)}`),
  markHandoff: (body) => req('/api/handoff', body),
};

// 연습 인계함은 브라우저마다 따로 둔다(심사위원끼리 섞이지 않게)
export function clientId() {
  let id = store.get('dm:client');
  if (!id || !/^[a-z0-9]{8,40}$/.test(id)) { id = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => (b % 36).toString(36)).join(''); store.set('dm:client', id); }
  return id;
}
export const inboxQuery = (practice) => (practice ? { practice: '1', client: clientId() } : { office: '청주시청 당직실' });
