# Repo Scout

[![GitHub release](https://img.shields.io/github/v/release/itsviplove/repo-scout)](https://github.com/itsviplove/repo-scout/releases)
[![License](https://img.shields.io/github/license/itsviplove/repo-scout)](https://github.com/itsviplove/repo-scout/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

Discover interesting public GitHub repositories and turn them into buildable startup opportunities.

Repo Scout `v1.0.0` is the first full **Scout-to-Startup OS** release: it ranks opportunity quality, generates startup theses, keeps cross-run opportunity memory, produces stronger execution handoff docs, and ships an optional local dashboard for review.

## What it does

- Searches GitHub by topic or preset topic pack
- Fetches repo metadata and optional README content
- Profiles repos for capabilities, freshness, popularity, integration potential, docs quality, maintenance, commit/release health, and trust/confidence
- Shows capability evidence and warnings so rankings are easier to trust
- Tracks star momentum / rising repos across saved runs
- Combines 2-3 repos into ranked product ideas
- Scores ideas across overall quality, timing, repo quality, repeat strength, and startup opportunity
- Generates startup theses for the strongest ideas
- Produces product specs and OpenClaw-ready execution prompts from saved ideas
- Saves run history and supports diffs between scans
- Maintains a local SQLite scouting library from saved runs
- Surfaces recurring repos, topic lanes, idea families, opportunity themes, and startup opportunities from the local library
- Supports bookmarks/watchlist workflows and bookmark mover summaries
- Generates repeat-aware daily digests and weekly scouting briefs
- Previews future pack rotations for automation planning
- Generates an optional static startup dashboard HTML view
- Loads defaults from `.repo-scout.json`
- Optional `--llm` mode can enrich ideas through an OpenClaw-compatible HTTP endpoint
- Caches API responses locally

## Quick start

```bash
cd repo-scout
node ./bin/repo-scout.js ideas "ai agents automation" --limit 12 --ideas 6
```

## Main commands

- `packs` — list built-in topic packs
- `search` — search repos
- `explain` — inspect one repo
- `ideas` — generate ranked project ideas
- `report` — generate a static HTML scouting report
- `brief` — generate an OpenClaw-friendly scouting brief
- `daily-scout` — generate a repeat-aware daily scout digest
- `weekly-scout` — generate a weekly scouting brief from recent history
- `schedule-preview` — preview pack rotation for future automated runs
- `trending` — show rising repos from saved history
- `history` — list saved runs
- `diff` — compare two saved runs
- `library` — inspect the SQLite scouting library
- `bookmark` — save/list/refresh watched repos and show movers
- `spec` — generate a product spec from a saved idea
- `thesis` — generate a startup thesis from a saved idea
- `openclaw-prompt` — generate an OpenClaw execution prompt from a saved idea
- `dashboard` — generate a local startup dashboard HTML file
- `config-init` — create a starter `.repo-scout.json`

## Examples

```bash
node ./bin/repo-scout.js report --topic-pack agents --limit 10 --ideas 4 --out scout-report.html
node ./bin/repo-scout.js ideas "browser automation" --llm
node ./bin/repo-scout.js brief --topic-pack agents --limit 8 --ideas 3
node ./bin/repo-scout.js daily-scout --style discord
node ./bin/repo-scout.js weekly-scout --days 7 --style discord
node ./bin/repo-scout.js schedule-preview --days 7
node ./bin/repo-scout.js library startup-opportunities --limit 8
node ./bin/repo-scout.js thesis --latest --idea 1
node ./bin/repo-scout.js spec --latest --idea 1
node ./bin/repo-scout.js openclaw-prompt --latest --idea 1
node ./bin/repo-scout.js dashboard --days 60 --preview-days 7 --out ./examples/repo-scout-dashboard.html
```

## Terminal views

For `search`, `ideas`, `history`, and `trending`, you can choose:

```bash
--format full
--format compact
--format table
```

## Library, memory, and bookmarks

Repo Scout maintains a local library database at:

```text
.repo-scout-history/repo-scout.db
```

Useful commands:

```bash
node ./bin/repo-scout.js library top-repos --limit 10
node ./bin/repo-scout.js library recurring-repos --limit 10
node ./bin/repo-scout.js library idea-families --limit 8
node ./bin/repo-scout.js library opportunity-themes --limit 8
node ./bin/repo-scout.js library startup-opportunities --limit 8
node ./bin/repo-scout.js bookmark add browser-use/browser-use --note "watch this"
node ./bin/repo-scout.js bookmark list
node ./bin/repo-scout.js bookmark refresh --all
node ./bin/repo-scout.js bookmark movers --limit 5
```

Note: Node's built-in SQLite currently prints an experimental warning on some runtimes.

## Startup workflow

A practical v1.0 loop:

```bash
node ./bin/repo-scout.js ideas --topic-pack agents --limit 8 --ideas 3 --format table
node ./bin/repo-scout.js thesis --latest --idea 1
node ./bin/repo-scout.js spec --latest --idea 1
node ./bin/repo-scout.js openclaw-prompt --latest --idea 1
node ./bin/repo-scout.js dashboard --days 60 --preview-days 7
```

That gives you:
- ranked startup opportunities
- a concise thesis/ICP/wedge/moat summary
- a stronger execution handoff spec
- an OpenClaw-ready build prompt
- a local dashboard for reviewing repeated patterns and hot lanes

## Config file

Create a starter config:

```bash
node ./bin/repo-scout.js config-init
```

Example `.repo-scout.json`:

```json
{
  "topic-pack": "agents",
  "limit": 10,
  "ideas": 4,
  "min-stars": 150,
  "days": 365,
  "sort": "stars",
  "no-readme": false,
  "llm": false
}
```

## Optional LLM enrichment

`--llm` is optional and best-effort.

Set:

```bash
OPENCLAW_BASE_URL=http://127.0.0.1:3000
OPENCLAW_MODEL=openclaw/default
```

If your gateway requires auth, also set:

```bash
OPENCLAW_GATEWAY_TOKEN=...
```

Then run:

```bash
node ./bin/repo-scout.js ideas --topic-pack agents --llm
```

## Notes

- Node.js 18+ recommended
- No runtime dependencies
- Works best with `GITHUB_TOKEN` if rate limits appear

## v1.0 highlights

- Trust scoring / explainability ✅
- Better terminal UX / output modes ✅
- Saved run history / diff ✅
- Trending / rising-star detection ✅
- SQLite scouting library + bookmarks ✅
- Config file support ✅
- OpenClaw-friendly brief flow ✅
- Product spec + OpenClaw prompt generation ✅
- Optional LLM-powered summaries ✅ (best-effort endpoint mode)
- Commit/release-aware quality heuristics ✅
- Repeat-aware daily scouting digests ✅
- Weekly scouting briefs + schedule preview ✅
- Watchlist refresh + movers ✅
- Library recurring-repo, topic-lane, idea-family, opportunity-theme, and startup-opportunity views ✅
- Opportunity scoring across repo quality + timing + repeat strength ✅
- Startup thesis generation ✅
- Stronger execution handoff in spec/prompt flows ✅
- Local startup dashboard HTML view ✅
