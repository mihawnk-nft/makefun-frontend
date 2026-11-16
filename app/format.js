// Small helpers for showing API values. No dependencies.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00', 250 or null) as '$1,000', '$0.50' or '—'. */
export function money(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** A plain number with thousands separators. */
export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

/** A deadline as a date in UTC. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** A date as '13 Nov 2026'. */
export function shortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
}

/** The time until a deadline: '2d 4h left', '35m left', or 'ended'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/**
 * A bounty's real state. A bounty past its deadline may still read status
 * open until its results are published, so the deadline decides, not the
 * status alone.
 */
export function bountyState(b) {
  const past = new Date(b.deadline).getTime() <= Date.now();
  if (past) return { key: 'ended', label: 'Ended' };
  const ms = new Date(b.deadline).getTime() - Date.now();
  if (ms < 24 * 3600000) return { key: 'soon', label: 'Closing soon' };
  return { key: 'open', label: 'Open' };
}

/** 'Open · still taking entries' / 'Ended · no longer taking entries'. */
export function acceptingLabel(b) {
  const past = new Date(b.deadline).getTime() <= Date.now();
  if (past) return 'Ended — no longer taking entries';
  if (b.acceptingSubmissions === false) return 'Not accepting entries right now';
  return 'Open — still taking entries';
}

/** A score value: prefer the API's display string, fall back to the raw value. */
export function scoreText(entry, key) {
  const shown = entry.display && entry.display[key];
  if (shown !== undefined && shown !== null && shown !== '') return String(shown);
  const raw = entry.values && entry.values[key];
  return raw === undefined || raw === null ? '—' : String(raw);
}
