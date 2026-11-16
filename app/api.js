// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// One request per view, then the answer is cached: entries live 60 seconds
// (the API's ETags are bound to the minute), and a revalidation sends
// If-None-Match so an unchanged answer costs a 304, not a full body.
// Requests already in flight are shared, so two views asking for the same
// URL at once cause one fetch, not two.

const API = 'https://make.fun/api';
const TTL_MS = 60000;

/** url -> { at, etag, data } */
const cache = new Map();
/** url -> Promise, for requests already in flight. */
const inflight = new Map();

async function fetchJson(path) {
  const url = API + path;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  if (inflight.has(url)) return inflight.get(url);

  const work = (async () => {
    const headers = {};
    if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
    const res = await fetch(url, { headers });
    if (res.status === 304 && hit) {
      hit.at = Date.now();
      return hit.data;
    }
    if (!res.ok) {
      const err = new Error(`make.fun API ${res.status} for ${path}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    cache.set(url, { at: Date.now(), etag: res.headers.get('ETag'), data });
    return data;
  })();

  inflight.set(url, work);
  try {
    return await work;
  } finally {
    inflight.delete(url);
  }
}

/** The open bounties: { items: [...] }. activity=times leaves out the activity a board does not show. */
export const getBounties = () => fetchJson('/competitions?status=open&activity=times');

/** Bounties whose results are published, for the Closed list. */
export const getClosedBounties = () => fetchJson('/competitions?status=resolved&activity=times');

/** One bounty, by its slug. */
export const getBounty = (slug) => fetchJson(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard. view: 'performance' | 'overall' | 'cost' | 'efficiency'. */
export const getLeaderboard = (slug, view) => {
  const q = view ? `?view=${encodeURIComponent(view)}` : '';
  return fetchJson(`/competitions/${encodeURIComponent(slug)}/leaderboard${q}`);
};

/** An account's public profile, by handle. */
export const getProfile = (handle) => fetchJson(`/profiles/${encodeURIComponent(handle)}`);
