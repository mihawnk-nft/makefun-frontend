# make.fun frontend

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/mihawnk-nft/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/mihawnk-nft/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, lean frontend for [make.fun](https://make.fun/c/makefun-frontend-01) — built for the [makefun-frontend-01 bounty](https://make.fun/c/makefun-frontend-01). Static files, no build step, no framework: it reads make.fun's public API alone (GET, CORS open) and shows the four surfaces a visitor needs — the live bounty board, a bounty's page, its leaderboard, and an account's public profile — each reachable by a link and by its own URL (hash routes).

## Surfaces

- **Board** `#/` — live bounties with live pot, entry fee, time left and entries; filter (All / Open / Closing soon / Ended / Free entry), sort (biggest pot / ending soon / most entries), search, and totals. `#/closed` lists closed bounties.
- **Bounty page** `#/bounty/<slug>` — summary, description, rules, rewards table with the live pot, dates and status. A bounty past its deadline is shown as ended even when the API still reports it open.
- **Leaderboard** `#/bounty/<slug>/leaderboard` — ranked entries with the bounty's metric columns, 50 at a time with a "show more" button.
- **Profile** `#/profile/<handle>` — public profile: display name, bio, avatar, GitHub, Discord, X, wallet with explorer link, record, entries and payouts.

## Performance notes

- First load is five small files (HTML, one CSS, three JS modules); no framework, no webfonts.
- API answers are cached in memory and revalidated with ETag / `If-None-Match`, so a repeat visit inside the same minute costs a 304 instead of a body.
- Leaderboards render 50 rows at a time; views update without rebuilding the page.
- All rendering uses the DOM API (`createElement` + `textContent`); no `innerHTML` with API data, no inline handlers, no dynamically created scripts.

## Run it

```sh
node serve.ts            # serves app/ on http://localhost:8080
```

Then open http://localhost:8080 in a desktop browser. No sign-in, no writes — the app only reads `https://make.fun/api`.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with `buildDossier` from `vendor/makefun-frontend.ts`. Two runs on the same repository write the same bytes.

## License

MIT — see [LICENSE](./LICENSE).
