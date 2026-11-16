// A make.fun frontend: the board, a bounty page, its leaderboard and an
// account's public profile, on hash routes.
//
//   #/                              the board (open bounties)
//   #/closed                        bounties whose results are published
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard
//   #/u/<handle>                    an account's public profile
//
// window.__shotReady is false while a page loads and true once its data is
// on screen, so a screenshot script knows when to capture. The header
// (brand, nav, search) is static; only #app re-renders, so typing in the
// search box never loses focus and a view change never rebuilds the page.

import { getBounties, getBounty, getClosedBounties, getLeaderboard, getProfile } from './api.js';
import { board, bounty, closedBoard, leaderboard, profile } from './views.js';

const app = document.getElementById('app');
const searchInput = document.getElementById('top-q');

const ui = {
  filter: 'all',
  sort: 'pot',
  query: '',
  lbView: 'performance',
  lbPage: 0,
};

function setNav(route) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === route) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function showError(err) {
  app.innerHTML = `<div class="error" role="alert">Could not load live data from make.fun (${err.message || 'network error'}).
    <button class="chip" data-action="retry">Retry</button></div>`;
  document.title = 'make.fun — live bounties';
  window.__shotReady = true;
}

async function render() {
  window.__shotReady = false;
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\//, '').split('/').map(decodeURIComponent);

  try {
    if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') {
      const slug = parts[1];
      const lb = await getLeaderboard(slug, ui.lbView);
      // The view the API answered with may differ from the one asked for.
      ui.lbView = lb.view || ui.lbView;
      setNav('');
      document.title = `${lb.competition.title} leaderboard | make.fun`;
      app.innerHTML = leaderboard(lb, ui);
    } else if (parts[0] === 'bounty' && parts[1]) {
      const b = await getBounty(parts[1]);
      setNav('');
      document.title = `${b.title} | make.fun`;
      app.innerHTML = bounty(b);
    } else if (parts[0] === 'u' && parts[1]) {
      const p = await getProfile(parts[1]);
      setNav('');
      document.title = `${p.display_name || p.handle} | make.fun`;
      app.innerHTML = profile(p);
    } else if (parts[0] === 'closed') {
      const data = await getClosedBounties();
      setNav('closed');
      document.title = 'Closed bounties | make.fun';
      app.innerHTML = closedBoard(data);
    } else {
      const data = await getBounties();
      setNav('board');
      document.title = 'make.fun — live bounties';
      app.innerHTML = board(data, ui);
    }
  } catch (err) {
    showError(err);
    return;
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

app.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'filter') {
    ui.filter = el.dataset.value;
    render();
  } else if (action === 'lb-view') {
    ui.lbView = el.dataset.value;
    ui.lbPage = 0;
    render();
  } else if (action === 'lb-more') {
    ui.lbPage += 1;
    render();
  } else if (action === 'toggle-desc') {
    const desc = document.getElementById('desc');
    if (!desc) return;
    const open = desc.classList.toggle('collapsed');
    el.textContent = open ? 'Read the full description' : 'Show less';
  } else if (action === 'retry') {
    render();
  }
});

app.addEventListener('change', (ev) => {
  if (ev.target.id === 'sort') {
    ui.sort = ev.target.value;
    render();
  }
});

let searchTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    ui.query = searchInput.value.trim();
    if (!location.hash.startsWith('#/bounty') && !location.hash.startsWith('#/u')) render();
    else location.hash = '#/';
  }, 200);
});

window.addEventListener('hashchange', () => {
  ui.lbPage = 0;
  render();
});

render();
