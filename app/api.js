// Read-only client for make.fun's public API (GET only, CORS open).
// Answers are cached in memory and revalidated with ETag / If-None-Match,
// so a repeat visit inside the same minute costs a 304 instead of a body.

const API_BASE = "https://make.fun/api";

// path -> { etag, data }
const cache = new Map();

export async function getJSON(path) {
  const hit = cache.get(path);
  const headers = {};
  if (hit && hit.etag) headers["If-None-Match"] = hit.etag;
  let res;
  try {
    res = await fetch(API_BASE + path, { headers });
  } catch (err) {
    // One retry on a network error, then the error stands.
    res = await fetch(API_BASE + path, { headers });
  }
  if (res.status === 304 && hit) return hit.data;
  if (!res.ok) throw new Error("make.fun API answered " + res.status + " for " + path);
  const data = await res.json();
  cache.set(path, { etag: res.headers.get("ETag"), data });
  return data;
}

/** Live board: { items: [...] }. status is "open" or "closed". */
export function listCompetitions(status) {
  return getJSON("/competitions?status=" + encodeURIComponent(status || "open"));
}

/** One bounty by slug, with summary, rules, rewards and dates. */
export function getCompetition(slug) {
  return getJSON("/competitions/" + encodeURIComponent(slug));
}

/** One bounty's leaderboard: { competition, phase, columns, entries }. */
export function getLeaderboard(slug) {
  return getJSON("/competitions/" + encodeURIComponent(slug) + "/leaderboard");
}

/** One account's public profile by handle. */
export function getProfile(handle) {
  return getJSON("/profiles/" + encodeURIComponent(handle));
}
