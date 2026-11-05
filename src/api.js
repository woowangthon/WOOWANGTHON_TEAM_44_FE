const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* */ } },
};
export { store };

export class NeedCode extends Error {}

async function req(path, body) {
  const headers = { 'content-type': 'application/json' };
  const code = store.get('dm:code');
  if (code) headers['x-demo-code'] = code;
  const r = await fetch(`${BASE}${path}`, body ? { method: 'POST', headers, body: JSON.stringify(body) } : { headers });
  const j = await r.json().catch(() => ({ error: `서버 응답을 읽지 못했습니다(${r.status})` }));
  if (r.status === 401 && j.need_code) throw new NeedCode(j.error);
  if (!r.ok) throw new Error(j.error || `요청 실패(${r.status})`);
  return j;
}

export const api = {
  scenarios: () => req('/api/scenarios'),
  scenario: (id) => req(`/api/scenarios?id=${encodeURIComponent(id)}`),
  session: (body) => req('/api/session', body),
};
