let csrf = '';

export async function initSession(): Promise<{ user: string; exp: string }> {
  const res = await fetch('/api/admin/session', { credentials: 'same-origin', cache: 'no-store' });
  if (res.status === 401) {
    location.replace('/admin/login');
    throw new Error('Session expirée');
  }
  const data = await res.json();
  csrf = data.csrf;
  return data;
}

async function call<T>(method: string, url: string, body?: BodyInit, json = true): Promise<T> {
  const headers: Record<string, string> = { 'X-CSRF-Token': csrf };
  if (json && body) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { method, headers, body, credentials: 'same-origin', cache: 'no-store' });
  if (res.status === 401) {
    location.replace('/admin/login');
    throw new Error('Session expirée');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const issues = Array.isArray(data.issues) ? ` — ${data.issues.map((i: { path: string; message: string }) => `${i.path} : ${i.message}`).join(' ; ')}` : '';
    throw new Error((data.error ?? `Erreur ${res.status}`) + issues);
  }
  return data as T;
}

export const api = {
  getContent: <T>() => call<T>('GET', '/api/admin/content'),
  putContent: <T>(c: unknown) => call<T>('PUT', '/api/admin/content', JSON.stringify(c)),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return call<{ ref: string; mime: string }>('POST', '/api/admin/upload', fd, false);
  },
  getMessages: <T>() => call<T>('GET', '/api/admin/messages'),
  deleteMessage: (id: string) => call('DELETE', `/api/admin/messages?id=${encodeURIComponent(id)}`),
  logout: () => call('DELETE', '/api/admin/session'),
};
