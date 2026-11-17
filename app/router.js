// Hash router: #/ board, #/closed closed board, #/bounty/<slug> bounty,
// #/bounty/<slug>/leaderboard leaderboard, #/profile/<handle> profile.
// Each route sets window.__shotReady false while loading and true once
// its data has rendered, so screenshot tooling knows when to shoot.
import { listCompetitions, getCompetition, getLeaderboard, getProfile } from "./api.js";
import {
  renderBoard,
  renderBounty,
  renderLeaderboard,
  renderProfile,
  renderLoading,
  renderError,
} from "./views.js";

const root = () => document.getElementById("view");

// Board filter/sort/search state, kept across navigations in this session.
const boardUi = { filter: "all", sort: "pot", query: "" };
const closedUi = { filter: "all", sort: "pot", query: "" };

function showBoard(closed) {
  const ui = closed ? closedUi : boardUi;
  const rerender = () => showBoard(closed);
  window.__shotReady = false;
  document.title = (closed ? "Closed bounties" : "Live bounties") + " — make.fun frontend";
  renderLoading(root(), closed ? "Loading closed bounties…" : "Loading live bounties…");
  listCompetitions(closed ? "closed" : "open")
    .then((data) => {
      renderBoard(root(), data.items || [], ui, rerender, closed);
      window.__shotReady = true;
    })
    .catch((err) => {
      renderError(root(), err.message, rerender);
      window.__shotReady = true;
    });
}

function showBounty(slug) {
  window.__shotReady = false;
  document.title = "Bounty — make.fun frontend";
  renderLoading(root(), "Loading bounty…");
  getCompetition(slug)
    .then((comp) => {
      document.title = (comp.title || comp.slug) + " — make.fun frontend";
      renderBounty(root(), comp);
      window.__shotReady = true;
    })
    .catch((err) => {
      renderError(root(), err.message, () => showBounty(slug));
      window.__shotReady = true;
    });
}

function showLeaderboard(slug) {
  window.__shotReady = false;
  document.title = "Leaderboard — make.fun frontend";
  renderLoading(root(), "Loading leaderboard…");
  let shown = 50;
  const load = () => {
    getLeaderboard(slug)
      .then((lb) => {
        const title = (lb.competition && lb.competition.title) || slug;
        document.title = title + " leaderboard — make.fun frontend";
        renderLeaderboard(root(), lb, shown, () => { shown += 50; load(); });
        window.__shotReady = true;
      })
      .catch((err) => {
        renderError(root(), err.message, load);
        window.__shotReady = true;
      });
  };
  load();
}

function showProfile(handle) {
  window.__shotReady = false;
  document.title = "Profile — make.fun frontend";
  renderLoading(root(), "Loading profile…");
  getProfile(handle)
    .then((prof) => {
      document.title = (prof.display_name || prof.handle) + " — make.fun frontend";
      renderProfile(root(), prof);
      window.__shotReady = true;
    })
    .catch((err) => {
      renderError(root(), err.message, () => showProfile(handle));
      window.__shotReady = true;
    });
}

export function navigate() {
  const hash = window.location.hash || "#/";
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  window.scrollTo(0, 0);
  if (parts.length === 0) return showBoard(false);
  if (parts[0] === "closed") return showBoard(true);
  if (parts[0] === "bounty" && parts[1] && parts[2] === "leaderboard") {
    return showLeaderboard(decodeURIComponent(parts[1]));
  }
  if (parts[0] === "bounty" && parts[1]) return showBounty(decodeURIComponent(parts[1]));
  if (parts[0] === "profile" && parts[1]) return showProfile(decodeURIComponent(parts[1]));
  renderError(root(), "Unknown route: " + hash, () => { window.location.hash = "#/"; });
  window.__shotReady = true;
}

export function initRouter() {
  window.addEventListener("hashchange", navigate);
  navigate();
}
