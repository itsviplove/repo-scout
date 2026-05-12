# Repo Scout

[![GitHub release](https://img.shields.io/github/v/release/itsviplove/repo-scout)](https://github.com/itsviplove/repo-scout/releases)
[![License](https://img.shields.io/github/license/itsviplove/repo-scout)](https://github.com/itsviplove/repo-scout/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

Discover interesting public GitHub repositories and turn them into buildable project ideas.

Repo Scout is now opinionated about **trust**, **trend quality**, and **repeatable scouting** — not just raw GitHub search.

## What it does

- Searches GitHub by topic or preset topic pack
- Fetches repo metadata and optional README content
- Profiles repos for capabilities, freshness, popularity, integration potential, docs quality, maintenance, and trust/confidence
- Shows capability evidence and warnings so rankings are easier to trust
- Tracks star momentum / rising repos across saved runs
- Combines 2-3 repos into ranked project ideas
- Adds market angle, difficulty, differentiation, and risk notes to ideas
- Exports Markdown, JSON, or HTML reports with dashboard filters
- Saves run history and supports diffs between scans
- Loads defaults from `.repo-scout.json`
- Can produce an OpenClaw-friendly scouting brief
- Optional `--llm` mode can enrich ideas through an OpenClaw-compatible HTTP endpoint
- Caches API responses locally

## Quick start

```bash
cd repo-scout
node ./bin/repo-scout.js ideas "ai agents automation" --limit 12 --ideas 6
```

## Commands

- `packs` — list built-in topic packs
- `search` — search repos
- `explain` — inspect one repo
- `ideas` — generate ranked project ideas
- `report` — generate a static HTML report
- `brief` — generate an OpenClaw-friendly scouting brief
- `trending` — show rising repos from saved history
- `history` — list saved runs
- `diff` — compare two saved runs
- `config-init` — create a starter `.repo-scout.json`

## Example

```bash
node ./bin/repo-scout.js report --topic-pack agents --limit 10 --ideas 4 --out scout-report.html
node ./bin/repo-scout.js brief --topic-pack agents --limit 8 --ideas 3
node ./bin/repo-scout.js ideas "browser automation" --llm
```

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

Then run:

```bash
node ./bin/repo-scout.js ideas --topic-pack agents --llm
```

## Notes

- Node.js 18+ recommended
- No runtime dependencies
- Works best with `GITHUB_TOKEN` if rate limits appear

## Roadmap

- Trust scoring / explainability ✅
- Saved run history / diff ✅
- Trending / rising-star detection ✅
- Better HTML dashboard ✅
- Config file support ✅
- OpenClaw-friendly brief flow ✅
- Optional LLM-powered summaries ✅ (best-effort endpoint mode)
