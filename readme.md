# Repo Scout

[![GitHub release](https://img.shields.io/github/v/release/itsviplove/repo-scout)](https://github.com/itsviplove/repo-scout/releases)
[![License](https://img.shields.io/github/license/itsviplove/repo-scout)](https://github.com/itsviplove/repo-scout/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

Discover interesting public GitHub repositories and turn them into buildable startup opportunities.

Repo Scout `v2.0.0` is a full **Scout-to-Startup OS + local website** release. It can scout repos, rank startup opportunities, generate founder materials, track incubating ideas, and run as a local web app.

## What it does

- Searches GitHub by topic or preset topic pack
- Fetches repo metadata and optional README content
- Profiles repos for capabilities, freshness, popularity, integration potential, docs quality, maintenance, commit/release health, and trust/confidence
- Tracks star momentum / rising repos across saved runs
- Combines 2-3 repos into ranked product ideas
- Scores ideas across overall quality, timing, repo quality, repeat strength, and startup opportunity
- Generates startup theses, founder memos, investor memos, PRD-style memos, GTM memos, and next-action lists
- Produces product specs and OpenClaw-ready execution prompts from saved ideas
- Saves run history and supports diffs between scans
- Maintains a local SQLite scouting library from saved runs
- Surfaces recurring repos, topic lanes, idea families, opportunity themes, and startup opportunities from the local library
- Supports bookmarks/watchlist workflows and bookmark mover summaries
- Supports incubator promotion and decision logging for founder workflow tracking
- Generates repeat-aware daily digests and weekly scouting briefs
- Previews future pack rotations for automation planning
- Generates static dashboard HTML output
- Runs as a local website with JSON APIs and an interactive scouting UI
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
- `thesis` — generate a startup thesis from a saved idea
- `memo` — generate founder / investor / PRD / GTM memo outputs
- `next-actions` — generate a concrete action list for the selected idea
- `spec` — generate a product spec from a saved idea
- `openclaw-prompt` — generate an OpenClaw execution prompt from a saved idea
- `export` — export a memo/brief bundle to markdown/json/discord-friendly output
- `lane-report` — summarize hot market lanes from recent history
- `promote` — move a saved idea into the incubator queue
- `incubator` — inspect promoted ideas
- `decision` — log or view founder decisions
- `daily-scout` — generate a repeat-aware daily scout digest
- `weekly-scout` — generate a weekly scouting brief from recent history
- `schedule-preview` — preview pack rotation for future automated runs
- `dashboard` — generate a local startup dashboard HTML file
- `serve` — run Repo Scout as a local website
- `trending` — show rising repos from saved history
- `history` — list saved runs
- `diff` — compare two saved runs
- `library` — inspect the SQLite scouting library
- `bookmark` — save/list/refresh watched repos and show movers
- `config-init` — create a starter `.repo-scout.json`

## Website mode

Run the local web app:

```bash
node ./bin/repo-scout.js serve --port 4040
```

Then open:

```text
http://127.0.0.1:4040
```

The website can:
- run scouting from the browser
- show recent opportunities and market lanes
- promote ideas into the incubator
- log founder decisions
- use local JSON APIs for automation or other tools

Available API paths include:
- `/api/summary`
- `/api/ideas?topic=...&limit=...&ideas=...&noReadme=1`
- `/api/promote` (POST)
- `/api/decision` (POST)

## Examples

```bash
node ./bin/repo-scout.js ideas "ai agents automation" --format table
node ./bin/repo-scout.js thesis --latest --idea 1
node ./bin/repo-scout.js memo --type founder --latest --idea 1
node ./bin/repo-scout.js memo --type investor --latest --idea 1
node ./bin/repo-scout.js next-actions --latest --idea 1
node ./bin/repo-scout.js export --type investor --latest --idea 1 --out ./examples/investor-memo.md
node ./bin/repo-scout.js lane-report --days 90 --limit 8
node ./bin/repo-scout.js promote --latest --idea 1 --note "validate with founder interviews"
node ./bin/repo-scout.js incubator --limit 10
node ./bin/repo-scout.js decision add --title "Workflow Coding Memory Copilot" --status watch --note "Worth validating"
node ./bin/repo-scout.js dashboard --days 60 --preview-days 7 --out ./examples/repo-scout-dashboard.html
node ./bin/repo-scout.js serve --port 4040
```

## Terminal views

For `search`, `ideas`, `history`, and `trending`, you can choose:

```bash
--format full
--format compact
--format table
```

## Library, memory, and founder workflow

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
node ./bin/repo-scout.js incubator --limit 10
node ./bin/repo-scout.js decision list --limit 10
```

Note: Node's built-in SQLite currently prints an experimental warning on some runtimes.

## Startup workflow

A practical v2.0 loop:

```bash
node ./bin/repo-scout.js ideas --topic-pack agents --limit 8 --ideas 3 --no-readme --format table
node ./bin/repo-scout.js thesis --latest --idea 1
node ./bin/repo-scout.js memo --type founder --latest --idea 1
node ./bin/repo-scout.js next-actions --latest --idea 1
node ./bin/repo-scout.js promote --latest --idea 1
node ./bin/repo-scout.js decision add --title "My chosen idea" --status watch --note "Interview first"
node ./bin/repo-scout.js serve --port 4040
```

That gives you:
- ranked startup opportunities
- a concise thesis / wedge / moat summary
- founder-grade memo outputs
- explicit next actions
- incubator and decision tracking
- a local website for reviewing and operating the pipeline

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

## v2.0 highlights

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
- Founder / investor / PRD / GTM memo outputs ✅
- Next-action generation ✅
- Incubator promotion + decision logging ✅
- Local startup dashboard HTML view ✅
- Local website mode with interactive scouting UI ✅
