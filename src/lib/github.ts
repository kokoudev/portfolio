import { getSecret, GITHUB_USERNAME } from 'astro:env/server';
import { cacheStore } from './store';

export interface Repo {
  name: string;
  description: string;
  url: string;
  language: string;
  stars: number;
  updatedAt: string;
}

const TTL_MS = 6 * 60 * 60 * 1000; // 6 h

/** Dépôts publics GitHub, mis en cache 6 h dans Netlify Blobs (la limite publique est de 60 req/h). */
export async function getRepos(): Promise<Repo[]> {
  const user = GITHUB_USERNAME || 'kokoudev';
  if (!/^[A-Za-z0-9-]{1,39}$/.test(user)) return [];
  const key = `github/${user}`;
  let cached = null as { at: number; repos: Repo[] } | null;
  try {
    cached = (await cacheStore().get(key, { type: 'json' })) as { at: number; repos: Repo[] } | null;
    if (cached && Date.now() - cached.at < TTL_MS) return cached.repos;
  } catch {
    /* Blobs indisponible : on tente l'API directement */
  }
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'portfolio-soedje',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const token = getSecret('GITHUB_TOKEN');
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`https://api.github.com/users/${user}/repos?type=owner&sort=updated&per_page=30`, {
      headers,
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const data = (await res.json()) as Array<Record<string, unknown>>;
    const repos: Repo[] = data
      .filter((r) => !r.fork && !r.private && !r.archived)
      .map((r) => ({
        name: String(r.name),
        description: typeof r.description === 'string' ? r.description : '',
        url: String(r.html_url),
        language: typeof r.language === 'string' ? r.language : '',
        stars: Number(r.stargazers_count) || 0,
        updatedAt: String(r.pushed_at ?? r.updated_at ?? ''),
      }))
      .filter((r) => r.url.startsWith('https://github.com/'))
      .slice(0, 9);
    try {
      await cacheStore().setJSON(key, { at: Date.now(), repos });
    } catch {
      /* ignore */
    }
    return repos;
  } catch (err) {
    console.error('[github]', err instanceof Error ? err.message : err);
    return cached?.repos ?? [];
  }
}
