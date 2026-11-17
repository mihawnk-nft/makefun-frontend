// Formatting helpers for the make.fun frontend.
// Money, numbers, dates and HTML escaping, kept dependency-free.

const usdInt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const usdExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const intFmt = new Intl.NumberFormat("en-US");

/** Format a dollar amount: "$1,325" for whole dollars, "$12.50" otherwise. */
export function money(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return Number.isInteger(v) ? usdInt.format(v) : usdExact.format(v);
}

/** Format a plain count with thousands separators: 75,764. */
export function num(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return intFmt.format(Math.trunc(v));
}

/** Human time left until an ISO deadline: "27d 5h left", "42m left", "Ended". */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "Ended";
  const min = Math.floor(ms / 60000);
  if (min < 60) return min + "m left";
  const hrs = Math.floor(min / 60);
  if (hrs < 48) return hrs + "h " + (min % 60) + "m left";
  const days = Math.floor(hrs / 24);
  return days + "d " + (hrs % 24) + "h left";
}

/** Short date + time for an ISO timestamp, e.g. "Nov 24, 2026, 5:00 PM". */
export function dateStr(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Escape a string for safe use inside HTML text. */
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

/** True when the ISO deadline has passed. */
export function isPast(iso) {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t <= Date.now();
}
