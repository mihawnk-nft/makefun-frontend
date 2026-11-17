// Renderers for the four surfaces. Everything is built with the DOM API
// (createElement + textContent), never innerHTML with API data, so no
// markup from the network can run as code in this app.
import { money, num, timeLeft, dateStr, isPast } from "./format.js";

/** Small DOM helper: el("a", { href: "#/x", class: "btn" }, "label"). */
export function el(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    }
  }
  for (const kid of kids.flat(9)) {
    if (kid === null || kid === undefined || kid === false) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

function link(href, text, cls) {
  return el("a", { href, class: cls || undefined }, text);
}

function statCard(label, value, sub) {
  return el(
    "div",
    { class: "stat" },
    el("div", { class: "stat-value", text: value }),
    el("div", { class: "stat-label", text: label }),
    sub ? el("div", { class: "stat-sub", text: sub }) : null,
  );
}

function chip(text) {
  return el("span", { class: "chip", text });
}

/** Live pot of a bounty: the pot the fees joined, else its base reward. */
export function livePot(b) {
  const pot = Number(b.potUsd);
  if (Number.isFinite(pot) && pot > 0) return pot;
  return Number(b.rewardAmount) || 0;
}

export function entryFeeLabel(b) {
  const fee = Number(b.entryFeeUsd);
  if (Number.isFinite(fee) && fee > 0) return money(fee);
  return "Free entry";
}

/** "Open" only while the deadline is ahead; the API status alone lies. */
export function bountyState(b) {
  if (isPast(b.deadline)) return "ended";
  return (b.status || "open").toLowerCase();
}

function stateBadge(b) {
  const state = bountyState(b);
  if (state === "ended") return el("span", { class: "badge ended", text: "Ended" });
  if (state === "open") return el("span", { class: "badge open", text: "Open" });
  return el("span", { class: "badge", text: b.status || "—" });
}

export function bountyCard(b) {
  const card = el("article", { class: "card" + (bountyState(b) === "ended" ? " is-ended" : "") });
  const head = el("h3", { class: "card-title" }, link("#/bounty/" + b.slug, b.title || b.slug));
  const meta = el(
    "p",
    { class: "card-meta" },
    (b.sponsor && b.sponsor.name) || "make.fun",
    b.sponsor && b.sponsor.isVerified ? " ✓" : "",
    b.category ? " · " + b.category : "",
  );
  const pot = el("p", { class: "card-pot" }, money(livePot(b)), el("span", { class: "pot-note", text: " live pot" }));
  const facts = el(
    "dl",
    { class: "facts" },
    el("div", null, el("dt", { text: "Entry fee" }), el("dd", { text: entryFeeLabel(b) })),
    el("div", null, el("dt", { text: "Time left" }), el("dd", { text: timeLeft(b.deadline) })),
    el("div", null, el("dt", { text: "Entries" }), el("dd", { text: num(b.submissionCount) })),
  );
  const foot = el(
    "p",
    { class: "card-foot" },
    stateBadge(b),
    " ",
    link("#/bounty/" + b.slug + "/leaderboard", "Leaderboard →"),
  );
  card.append(head, meta, pot, facts, foot);
  return card;
}

export function renderLoading(root, label) {
  root.replaceChildren(el("p", { class: "loading", text: label || "Loading…" }));
}

export function renderError(root, message, onRetry) {
  const box = el("div", { class: "error" }, el("p", { text: "Could not load this view: " + message }));
  if (onRetry) {
    const btn = el("button", { class: "btn", type: "button", text: "Try again" });
    btn.addEventListener("click", onRetry);
    box.append(btn);
  }
  root.replaceChildren(box);
}

// ---------------------------------------------------------------- board

function applyBoardFilter(items, ui) {
  let list = items.slice();
  if (ui.query) {
    const q = ui.query.toLowerCase();
    list = list.filter((b) =>
      [b.title, b.slug, b.category, (b.skills || []).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  if (ui.filter === "open") list = list.filter((b) => bountyState(b) === "open");
  else if (ui.filter === "closing") {
    list = list.filter((b) => {
      const t = new Date(b.deadline).getTime() - Date.now();
      return t > 0 && t < 48 * 3600 * 1000;
    });
  } else if (ui.filter === "ended") list = list.filter((b) => bountyState(b) === "ended");
  else if (ui.filter === "free") list = list.filter((b) => !(Number(b.entryFeeUsd) > 0));
  if (ui.sort === "ending") list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  else if (ui.sort === "entries") list.sort((a, b) => (b.submissionCount || 0) - (a.submissionCount || 0));
  else list.sort((a, b) => livePot(b) - livePot(a));
  return list;
}

/**
 * Board view. ui is the caller's mutable { filter, sort, query } state;
 * rerender() is called after any control change.
 */
export function renderBoard(root, items, ui, rerender, closed) {
  const open = items.filter((b) => bountyState(b) === "open");
  // Only open bounties hold a live pot; ended ones keep their entries count.
  const pot = open.reduce((s, b) => s + livePot(b), 0);
  const entries = items.reduce((s, b) => s + (Number(b.submissionCount) || 0), 0);

  const head = el("div", { class: "page-head" },
    el("h2", { text: closed ? "Closed bounties" : "Live bounties" }),
    el("p", { class: "lede", text: closed
      ? "Bounties whose deadline has passed, or whose results are published."
      : "Every open bounty on make.fun, with its live pot, entry fee, time left and entries." }),
  );

  const stats = el("div", { class: "stats" },
    statCard("Total live pot", money(pot)),
    statCard(closed ? "Closed bounties" : "Open bounties", num(closed ? items.length : open.length)),
    statCard("Total entries", num(entries)),
  );

  const controls = el("div", { class: "controls" });
  const filters = [
    ["all", "All"],
    ["open", "Open"],
    ["closing", "Closing soon"],
    ["ended", "Ended"],
    ["free", "Free entry"],
  ];
  for (const [key, label] of filters) {
    const btn = el("button", {
      class: "pill" + (ui.filter === key ? " active" : ""),
      type: "button",
      text: label,
    });
    btn.setAttribute("aria-pressed", ui.filter === key ? "true" : "false");
    btn.addEventListener("click", () => { ui.filter = key; rerender(); });
    controls.append(btn);
  }
  const sort = el("select", { class: "sort", "aria-label": "Sort bounties" });
  for (const [value, label] of [["pot", "Biggest pot"], ["ending", "Ending soon"], ["entries", "Most entries"]]) {
    const opt = el("option", { value, text: label });
    if (ui.sort === value) opt.selected = true;
    sort.append(opt);
  }
  sort.addEventListener("change", () => { ui.sort = sort.value; rerender(); });
  const search = el("input", {
    class: "search",
    type: "search",
    placeholder: "Search bounties…",
    "aria-label": "Search bounties",
    value: ui.query,
  });
  search.addEventListener("input", () => { ui.query = search.value; rerender(); });
  controls.append(sort, search);

  const list = applyBoardFilter(items, ui);
  const grid = el("div", { class: "grid" });
  if (list.length === 0) {
    grid.append(el("p", { class: "empty", text: "No bounties match this filter." }));
  } else {
    for (const b of list) grid.append(bountyCard(b));
  }

  root.replaceChildren(head, stats, controls, grid);
  // Keep the caret in the search box after a re-render.
  if (ui.query) {
    const box = root.querySelector(".search");
    if (box) { box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
  }
}

// ---------------------------------------------------------------- bounty

function rewardRows(comp) {
  const rows = [];
  if (Array.isArray(comp.rewardsNow) && comp.rewardsNow.length) {
    for (const r of comp.rewardsNow) {
      const fee = Number(r.feeShareUsd);
      rows.push([Number(r.place), money(r.amountUsd), Number.isFinite(fee) && fee > 0 ? "+ " + money(fee) + " fees" : ""]);
    }
  } else if (comp.rewards && typeof comp.rewards === "object") {
    const places = Object.keys(comp.rewards).map(Number).sort((a, b) => a - b);
    for (const p of places) rows.push([p, money(comp.rewards[String(p)]), ""]);
  }
  return rows;
}

function textBlock(text) {
  const p = el("p", { class: "prose" });
  p.textContent = text || "—";
  return p;
}

export function renderBounty(root, comp) {
  const ended = bountyState(comp) === "ended";
  const head = el("div", { class: "page-head" },
    el("h2", { text: comp.title || comp.slug }),
    el("p", { class: "card-meta" },
      (comp.sponsor && comp.sponsor.name) || "make.fun",
      comp.sponsor && comp.sponsor.isVerified ? " ✓" : "",
      comp.category ? " · " + comp.category : "",
    ),
  );
  const banner = ended
    ? el("p", { class: "banner", text: "This bounty has passed its deadline and no longer takes entries." })
    : null;

  const stats = el("div", { class: "stats" },
    statCard("Live pot", money(livePot(comp)), "reward " + money(comp.rewardAmount)),
    statCard("Entry fee", entryFeeLabel(comp)),
    statCard("Entries", num(comp.submissionCount)),
    statCard("Deadline", dateStr(comp.deadline), timeLeft(comp.deadline)),
  );

  const links = el("p", { class: "actions" },
    link("#/bounty/" + comp.slug + "/leaderboard", "View leaderboard →", "btn"),
    " ",
    el("a", { class: "btn ghost", href: "https://make.fun/c/" + comp.slug, text: "Open on make.fun ↗" }),
  );

  const rewards = el("section", { class: "section" }, el("h3", { text: "Rewards" }));
  const rows = rewardRows(comp);
  if (rows.length) {
    const table = el("table", { class: "table" });
    const thead = el("thead", null, el("tr", null, el("th", { text: "Place" }), el("th", { text: "Prize" }), el("th", { text: "Note" })));
    const tbody = el("tbody");
    for (const [place, prize, note] of rows) {
      tbody.append(el("tr", null, el("td", { text: "#" + place }), el("td", { text: prize }), el("td", { text: note })));
    }
    table.append(thead, tbody);
    rewards.append(table);
  } else {
    rewards.append(el("p", { class: "empty", text: "No reward table published for this bounty." }));
  }

  const about = el("section", { class: "section" }, el("h3", { text: "About" }));
  if (comp.summary) about.append(textBlock(comp.summary));
  if (comp.description) about.append(textBlock(comp.description));
  if (comp.rules) {
    about.append(el("h4", { text: "Rules" }), textBlock(comp.rules));
  }
  if (comp.skills && comp.skills.length) {
    const chips = el("p", { class: "chips" });
    for (const s of comp.skills) chips.append(chip(s));
    about.append(chips);
  }
  const dates = el("p", { class: "muted" },
    "Opens: " + dateStr(comp.opensAt) + " · Deadline: " + dateStr(comp.deadline) +
    " · Status: " + (ended ? "ended (by deadline)" : comp.status || "open"),
  );
  about.append(dates);

  const children = [head];
  if (banner) children.push(banner);
  children.push(stats, links, rewards, about);
  root.replaceChildren(...children);
}

// ---------------------------------------------------------------- leaderboard

export function renderLeaderboard(root, lb, shown, onMore) {
  const comp = lb.competition || {};
  const cols = (lb.columns || []).filter((c) => !c.hidden);
  const entries = lb.entries || [];
  const visible = entries.slice(0, shown);

  const head = el("div", { class: "page-head" },
    el("h2", { text: "Leaderboard" }),
    el("p", { class: "lede" },
      link("#/bounty/" + comp.slug, comp.title || comp.slug),
      lb.phase && lb.phase.title ? " · " + lb.phase.title : "",
      " · " + num(entries.length) + " entries",
    ),
  );

  const table = el("table", { class: "table wide" });
  const headerRow = el("tr", null, el("th", { text: "#" }), el("th", { text: "Entry" }));
  for (const c of cols) headerRow.append(el("th", { text: c.title || c.key }));
  const thead = el("thead", null, headerRow);
  const tbody = el("tbody");
  for (const e of visible) {
    const row = el("tr");
    row.append(el("td", { text: e.rank ?? "—" }));
    const cell = el("td");
    if (e.handle) cell.append(link("#/profile/" + e.handle, "@" + e.handle, "handle"));
    if (e.title) cell.append(el("div", { class: "entry-title", text: e.title }));
    if (e.prize_rank && e.prize_rank <= 20) {
      cell.append(el("span", { class: "badge prize", text: "Prize #" + e.prize_rank }));
    }
    row.append(cell);
    for (const c of cols) {
      const v = e.values ? e.values[c.key] : undefined;
      let text = "—";
      if (typeof v === "number") {
        text = c.precision ? v.toFixed(c.precision) : num(v);
      }
      row.append(el("td", { class: "num", text }));
    }
    tbody.append(row);
  }
  table.append(thead, tbody);

  const foot = el("div", { class: "more" });
  if (entries.length > shown) {
    const btn = el("button", {
      class: "btn",
      type: "button",
      text: "Show more (" + num(entries.length - shown) + " remaining)",
    });
    btn.addEventListener("click", onMore);
    foot.append(btn);
  } else if (entries.length === 0) {
    foot.append(el("p", { class: "empty", text: "No entries yet." }));
  }

  root.replaceChildren(head, table, foot);
}

// ---------------------------------------------------------------- profile

function extLink(href, text) {
  return el("a", { href, text });
}

export function renderProfile(root, prof) {
  const name = prof.display_name || prof.handle;
  const head = el("div", { class: "profile-head" });
  const avatarUrl = prof.avatar || prof.image || null;
  if (avatarUrl) {
    const img = el("img", { class: "avatar", alt: name + " avatar" });
    img.setAttribute("crossorigin", "anonymous");
    img.src = avatarUrl;
    head.append(img);
  } else {
    head.append(el("div", { class: "avatar fallback", text: String(name).slice(0, 2).toUpperCase() }));
  }
  const idBlock = el("div", null,
    el("h2", { text: name }),
    el("p", { class: "muted", text: "@" + prof.handle }),
    prof.bio ? el("p", { class: "bio", text: prof.bio }) : null,
  );
  head.append(idBlock);

  const links = el("ul", { class: "links" });
  if (prof.github_login) {
    links.append(el("li", null, "GitHub: ", extLink("https://github.com/" + prof.github_login, prof.github_login)));
  }
  if (prof.discord && prof.discord.username) {
    links.append(el("li", null, "Discord: ", prof.discord.url
      ? extLink(prof.discord.url, prof.discord.username)
      : el("span", { text: prof.discord.username })));
  }
  if (prof.x) {
    const xHandle = typeof prof.x === "string" ? prof.x : (prof.x.username || prof.x.handle || null);
    const xUrl = typeof prof.x === "object" && prof.x.url ? prof.x.url : (xHandle ? "https://x.com/" + xHandle : null);
    if (xUrl) links.append(el("li", null, "X: ", extLink(xUrl, xHandle ? "@" + xHandle : "X profile")));
  }
  if (prof.wallet && prof.wallet.address) {
    const addr = prof.wallet.address;
    const short = addr.length > 14 ? addr.slice(0, 6) + "…" + addr.slice(-4) : addr;
    links.append(el("li", null, "Wallet: ",
      prof.wallet.explorer_url ? extLink(prof.wallet.explorer_url, short) : el("span", { text: short })));
  }
  if (prof.joined_at) links.append(el("li", null, "Joined: " + dateStr(prof.joined_at)));

  const rec = prof.record || {};
  const stats = el("div", { class: "stats" },
    statCard("Entered", num(rec.competitions_entered)),
    statCard("Placed", num(rec.competitions_placed)),
    statCard("Won", num(rec.competitions_won)),
    statCard("Prize money", money(rec.prize_usd)),
  );

  const sols = el("section", { class: "section" }, el("h3", { text: "Entries" }));
  const solutions = prof.solutions || [];
  if (solutions.length) {
    const list = el("ul", { class: "list" });
    for (const s of solutions) {
      const item = el("li");
      if (s.competition && s.competition.slug) {
        item.append(link("#/bounty/" + s.competition.slug, s.title || s.competition.title || "Entry"));
        item.append(el("span", { class: "muted", text: " — " + (s.competition.title || s.competition.slug) }));
      } else {
        item.append(el("span", { text: s.title || "Entry" }));
      }
      list.append(item);
    }
    sols.append(list);
  } else {
    sols.append(el("p", { class: "empty", text: "No public entries yet." }));
  }

  const payouts = el("section", { class: "section" }, el("h3", { text: "Payouts" }));
  const pays = prof.payouts || [];
  if (pays.length) {
    const list = el("ul", { class: "list" });
    for (const p of pays) {
      list.append(el("li", { text: money(p.amount_usd ?? p.amount) + " — " + (p.competition_title || p.competition || "") }));
    }
    payouts.append(list);
  } else {
    payouts.append(el("p", { class: "empty", text: "No payouts recorded yet." }));
  }

  root.replaceChildren(head, links, stats, sols, payouts);
}
