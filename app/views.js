// The four pages, each a function from API data to HTML.
// All API strings go through esc() before they reach the page.

import { acceptingLabel, bountyState, date, esc, money, num, scoreText, shortDate, timeLeft } from './format.js';

const PAGE = 50;

/** The reward as it stands now: the prize plus any entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** A status badge, decided by the deadline, not the API status alone. */
const stateTag = (b) => {
  const s = bountyState(b);
  return `<span class="tag ${s.key}">${s.label}</span>`;
};

function bountyCard(b) {
  const s = bountyState(b);
  const skills = (b.skills || []).slice(0, 4).join(' · ');
  return `
  <li class="card">
    <div>
      <h3><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h3>
      <div class="meta">
        ${stateTag(b)}
        <span>${esc(b.category || '')}</span>
        <span>${timeLeft(b.deadline)}</span>
        <span>${num(b.submissionCount)} ${b.submissionCount === 1 ? 'entry' : 'entries'}</span>
        ${b.entryFeeUsd ? `<span class="tag fee">${money(b.entryFeeUsd)} fee</span>` : '<span class="tag fee">Free entry</span>'}
      </div>
      ${skills ? `<div class="skills">${esc(skills)}</div>` : ''}
    </div>
    <div class="pot"><b>${pot(b)}</b><span>live pot</span></div>
  </li>`;
}

/**
 * The bounty board. ui: { filter, sort, query }.
 * Filtering, sorting and searching all run on the one fetched list, so the
 * board costs a single API request however the visitor slices it.
 */
export function board(data, ui) {
  const items = (data.items || []).slice();
  const now = Date.now();
  const livePot = items.reduce((sum, b) => sum + (Number(b.potUsd ?? b.rewardAmount) || 0), 0);
  const closing = items.filter((b) => {
    const ms = new Date(b.deadline).getTime() - now;
    return ms > 0 && ms < 24 * 3600000;
  }).length;
  const entries = items.reduce((sum, b) => sum + (Number(b.submissionCount) || 0), 0);

  let rows = items;
  if (ui.filter === 'open') rows = rows.filter((b) => bountyState(b).key === 'open');
  if (ui.filter === 'soon') rows = rows.filter((b) => bountyState(b).key === 'soon');
  if (ui.filter === 'ended') rows = rows.filter((b) => bountyState(b).key === 'ended');
  if (ui.filter === 'free') rows = rows.filter((b) => !b.entryFeeUsd);
  if (ui.query) {
    const q = ui.query.toLowerCase();
    rows = rows.filter((b) =>
      [b.title, b.slug, b.category, (b.skills || []).join(' ')].join(' ').toLowerCase().includes(q),
    );
  }
  const byPot = (a, b) => (Number(b.potUsd ?? b.rewardAmount) || 0) - (Number(a.potUsd ?? a.rewardAmount) || 0);
  const byDeadline = (a, b) => new Date(a.deadline) - new Date(b.deadline);
  const byEntries = (a, b) => (Number(b.submissionCount) || 0) - (Number(a.submissionCount) || 0);
  const byNewest = (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
  rows.sort(ui.sort === 'deadline' ? byDeadline : ui.sort === 'entries' ? byEntries : ui.sort === 'newest' ? byNewest : byPot);

  const chip = (key, label) =>
    `<button class="chip" data-action="filter" data-value="${key}" aria-pressed="${ui.filter === key}">${label}</button>`;

  return `
  <h1>Live bounties</h1>
  <p class="muted">Every open competition on make.fun, with its live pot. A bounty past its deadline counts as ended even while it still reads open.</p>
  <div class="stats" role="status">
    <div class="stat"><b>${money(livePot)}</b><span>total live pot</span></div>
    <div class="stat"><b>${num(items.length)}</b><span>open bounties</span></div>
    <div class="stat"><b>${num(entries)}</b><span>entries so far</span></div>
    <div class="stat"><b>${num(closing)}</b><span>closing within 24h</span></div>
  </div>
  <div class="toolbar">
    ${chip('all', 'All')}
    ${chip('open', 'Open')}
    ${chip('soon', 'Closing soon')}
    ${chip('ended', 'Ended')}
    ${chip('free', 'Free entry')}
    <select id="sort" aria-label="Sort bounties">
      <option value="pot" ${ui.sort === 'pot' ? 'selected' : ''}>Biggest pot</option>
      <option value="deadline" ${ui.sort === 'deadline' ? 'selected' : ''}>Closing soonest</option>
      <option value="entries" ${ui.sort === 'entries' ? 'selected' : ''}>Most entries</option>
      <option value="newest" ${ui.sort === 'newest' ? 'selected' : ''}>Newest</option>
    </select>
  </div>
  <p class="count">${num(rows.length)} ${rows.length === 1 ? 'bounty' : 'bounties'}${ui.query ? ` matching “${esc(ui.query)}”` : ''}</p>
  ${rows.length ? `<ul class="board">${rows.map(bountyCard).join('')}</ul>` : '<div class="empty">No bounties match this filter. Try another one.</div>'}`;
}

/** Bounties whose results are published. */
export function closedBoard(data) {
  const items = (data.items || []).slice();
  items.sort((a, b) => new Date(b.deadline) - new Date(a.deadline));
  return `
  <h1>Closed bounties</h1>
  <p class="muted">Results published — these no longer take entries. The newest closed first.</p>
  ${items.length ? `<ul class="board">${items.map(bountyCard).join('')}</ul>` : '<div class="empty">No closed bounties yet.</div>'}`;
}

/** One bounty's page: summary, rewards table with the live pot, dates, rules, recent entries. */
export function bounty(b) {
  const s = bountyState(b);
  const rewardsNow = Array.isArray(b.rewardsNow) && b.rewardsNow.length
    ? b.rewardsNow
    : Object.entries(b.rewards || {}).map(([place, amount]) => ({ place: Number(place), baseUsd: amount, feeShareUsd: '0.00', amountUsd: amount }));
  const rewardRows = rewardsNow
    .map((r) => `<tr><td>${r.place === 1 ? '🥇 1st' : r.place === 2 ? '🥈 2nd' : r.place === 3 ? '🥉 3rd' : `${r.place}th`}</td><td>${money(r.baseUsd)}</td><td>${Number(r.feeShareUsd) > 0 ? `+ ${money(r.feeShareUsd)} fees` : '—'}</td><td>${money(r.amountUsd)}</td></tr>`)
    .join('');
  const phases = (b.phases || [])
    .map((p) => `<tr><td>${esc(p.title || p.key)}</td><td>${date(p.startsAt)}</td><td>${date(p.endsAt)}</td></tr>`)
    .join('');
  const subs = (b.submissions || []).slice(0, 10);
  const subRows = subs
    .map((x) => `<tr><td>${esc(x.hunter || '')}</td><td>${esc(x.title || '')}</td><td>${esc(x.status || '')}</td><td>${shortDate(x.createdAt)}</td></tr>`)
    .join('');
  const desc = String(b.description || '');
  const rules = String(b.rules || '');
  return `
  <p><a class="back" href="#/">← All bounties</a></p>
  <div class="hero">
    <div class="meta">${stateTag(b)} <span class="tag">${esc(b.category || '')}</span> <span class="muted small">${esc((b.skills || []).join(' · '))}</span></div>
    <h1>${esc(b.title)}</h1>
    <p class="sub">${esc(b.summary || '')}</p>
    <div class="hero-stats">
      <div><b>${pot(b)}</b><span>live pot</span></div>
      <div><b>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</b><span>entry fee</span></div>
      <div><b>${timeLeft(b.deadline)}</b><span>${date(b.deadline)}</span></div>
      <div><b>${num(b.submissionCount)}</b><span>entries</span></div>
    </div>
    <p class="small muted" style="margin-top:12px">${acceptingLabel(b)}</p>
    <div class="actions">
      <a class="linkbtn" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">View leaderboard</a>
      <a class="ghostbtn" href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">Open on make.fun ↗</a>
    </div>
  </div>

  <h2>Rewards</h2>
  <div class="table-wrap"><table class="rewards">
    <thead><tr><th>Place</th><th>Prize</th><th>Fee share</th><th>Total</th></tr></thead>
    <tbody>${rewardRows}</tbody>
  </table></div>
  <p class="small muted">The live pot is the prize plus every entry fee paid in so far.</p>

  ${phases ? `<h2>Dates</h2><div class="table-wrap"><table class="rewards"><thead><tr><th>Phase</th><th>Starts</th><th>Ends</th></tr></thead><tbody>${phases}</tbody></table></div>` : ''}

  <h2>Description</h2>
  <div class="textblock ${desc.length > 900 ? 'collapsed' : ''}" id="desc">${esc(desc)}</div>
  ${desc.length > 900 ? '<button class="chip more" data-action="toggle-desc">Read the full description</button>' : ''}

  ${rules ? `<h2>Rules</h2><details><summary>Show the bounty rules</summary><div class="textblock" style="margin-top:10px">${esc(rules)}</div></details>` : ''}

  ${subRows ? `<h2>Recent entries</h2><div class="table-wrap"><table class="grid"><thead><tr><th>Entrant</th><th>Entry</th><th>Status</th><th>Entered</th></tr></thead><tbody>${subRows}</tbody></table></div>` : ''}`;
}

/** A bounty's leaderboard, paginated 50 rows at a time. ui: { view, page }. */
export function leaderboard(lb, ui) {
  const cols = (lb.columns || []).filter((c) => !c.hidden);
  const entries = lb.entries || [];
  const shown = entries.slice(0, (ui.lbPage + 1) * PAGE);
  const views = lb.views || [];
  const viewBtns = views
    .map((v) => `<button class="chip" data-action="lb-view" data-value="${v}" aria-pressed="${ui.view === v}">${v}</button>`)
    .join('');
  const rows = shown
    .map((e) => {
      const medal = e.rank === 1 ? 'gold' : e.rank === 2 ? 'silver' : e.rank === 3 ? 'bronze' : '';
      const prize = e.prize_rank && e.prize_rank <= 20 ? ` <span class="tag">Top ${e.prize_rank}</span>` : '';
      const cells = cols
        .map((c) => `<td class="num">${esc(scoreText(e, c.key))}</td>`)
        .join('');
      return `<tr>
        <td><span class="medal ${medal}">${num(e.rank)}</span></td>
        <td><a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a>${prize}</td>
        <td class="entry">${esc(e.title || '')}</td>
        ${cells}
        <td>${esc(e.status || '')}</td>
      </tr>`;
    })
    .join('');
  const head = cols.map((c) => `<th class="num">${esc(c.title)}</th>`).join('');
  return `
  <p><a class="back" href="#/bounty/${encodeURIComponent(lb.competition.slug)}">← ${esc(lb.competition.title)}</a></p>
  <h1>${esc(lb.competition.title)} — leaderboard</h1>
  <p class="muted">${esc(lb.title || 'Results')} · ${esc(lb.phase ? lb.phase.title : '')} · ${num(entries.length)} entries · ranked by ${esc(lb.rank_key || 'score')}${lb.submission_rule ? ` · last submission counts (${esc(lb.submission_rule)})` : ''}</p>
  ${views.length > 1 ? `<div class="toolbar">${viewBtns}</div>` : ''}
  <div class="table-wrap"><table class="grid">
    <thead><tr><th>Rank</th><th>Entrant</th><th>Entry</th>${head}<th>Status</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5">No entries yet.</td></tr>'}</tbody>
  </table></div>
  <div class="pager">
    <span class="count">Showing ${num(shown.length)} of ${num(entries.length)}</span>
    ${shown.length < entries.length ? '<button data-action="lb-more">Show more</button>' : ''}
  </div>`;
}

/** An account's public profile. */
export function profile(p) {
  const rec = p.record || {};
  const avatar = p.avatar || p.image;
  const initials = (p.display_name || p.handle || '?').slice(0, 1).toUpperCase();
  const links = [];
  if (p.github_login) links.push(`<span>GitHub ${esc(p.github_login)}</span>`);
  if (p.discord && p.discord.url) links.push(`<a href="${esc(p.discord.url)}">Discord</a>`);
  if (p.x) links.push(`<span>X ${esc(p.x)}</span>`);
  if (p.wallet && p.wallet.explorer_url) links.push(`<a href="${esc(p.wallet.explorer_url)}">Solana wallet ↗</a>`);
  const sols = (p.solutions || []).map((s) => {
    const c = s.competition || {};
    return `<tr>
      <td><a href="#/bounty/${encodeURIComponent(c.slug)}">${esc(c.title || c.slug || '')}</a></td>
      <td>${esc(s.title || '')}</td>
      <td class="num">${s.placement ? `#${num(s.placement)}` : '—'}</td>
      <td class="num">${s.prize_usd ? money(s.prize_usd) : '—'}</td>
      <td class="num">${s.score ? esc(s.score.display ?? s.score.value ?? '') : '—'}</td>
      <td>${shortDate(s.entered_at)}</td>
    </tr>`;
  }).join('');
  return `
  <p><a class="back" href="#/">← All bounties</a></p>
  <div class="profile-head">
    ${avatar ? `<img class="avatar" crossorigin="anonymous" src="${esc(avatar)}" alt="">` : `<div class="avatar-fallback" aria-hidden="true">${esc(initials)}</div>`}
    <div>
      <h1 style="margin-bottom:2px">${esc(p.display_name || p.handle)}</h1>
      <p class="muted">@${esc(p.handle)} · joined ${shortDate(p.joined_at)}</p>
      ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
      ${links.length ? `<div class="profile-links">${links.join('')}</div>` : ''}
    </div>
  </div>
  <div class="stats">
    <div class="stat"><b>${num(rec.competitions_entered)}</b><span>competitions entered</span></div>
    <div class="stat"><b>${num(rec.competitions_placed)}</b><span>placed</span></div>
    <div class="stat"><b>${num(rec.competitions_won)}</b><span>won</span></div>
    <div class="stat"><b>${rec.best_placement ? `#${num(rec.best_placement)}` : '—'}</b><span>best placement</span></div>
  </div>
  <h2>Entries</h2>
  ${sols ? `<div class="table-wrap"><table class="grid"><thead><tr><th>Bounty</th><th>Entry</th><th>Place</th><th>Prize</th><th>Score</th><th>Entered</th></tr></thead><tbody>${sols}</tbody></table></div>`
    : '<div class="empty">No entries yet.</div>'}`;
}
