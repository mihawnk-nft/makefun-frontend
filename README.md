# make.fun live frontend

[![make.fun](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/mihawnk-nft/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/mihawnk-nft/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

A fast, read-only frontend for [make.fun](https://make.fun): the live bounty
board, a bounty's page with its live pot and rewards, its leaderboard, and
an account's public profile — each reachable by a link and by its own URL.

- `app/` — plain static files, no build step. Open `app/index.html` in a
  desktop browser (or run `node serve.ts` and open http://localhost:8080).
- Hash routes: `#/` board, `#/closed` closed bounties,
  `#/bounty/<slug>` a bounty, `#/bounty/<slug>/leaderboard` its leaderboard,
  `#/u/<handle>` a public profile.
- Reads only make.fun's public API (`GET https://make.fun/api/...`), with a
  60-second cache, ETag revalidation and one request per view. No sign-in,
  no writes, no third-party code.
- `main.ts` hands the app in (copies `app/` and `screenshots/` to `/output`
  and writes `/output/dossier.json`).

Entry for the make.fun bounty
[makefun-frontend-01](https://make.fun/bounty/makefun-frontend-01).
