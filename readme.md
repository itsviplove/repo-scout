# Repo Scout

[![GitHub release](https://img.shields.io/github/v/release/itsviplove/repo-scout)](https://github.com/itsviplove/repo-scout/releases)
[![License](https://img.shields.io/github/license/itsviplove/repo-scout)](https://github.com/itsviplove/repo-scout/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

Discover interesting public GitHub repositories and turn them into buildable project ideas.

Repo Scout is now opinionated about **trust**, **trend quality**, and **repeatable scouting** — not just raw GitHub search.

As of `v0.3.0`, it also has **terminal views**, a **SQLite scouting library**, **bookmarks**, and **OpenClaw-native spec/prompt outputs**.

## What it does

- Searches GitHub by topic or preset topic pack
- Fetches repo metadata and optional README content
- Profiles repos for capabilities, freshness, popularity, integration potential, docs quality, maintenance, and trust/confidence
- Shows capability evidence and warnings so rankings are easier to trust
- Adds quality tiers and clearer score breakdowns for repo trust
- Tracks star momentum / rising repos across saved runs
- Combines 2-3 repos into ranked project ideas
- Adds market angle, use case, difficulty, differentiation, and risk notes to ideas
- Supports `--format full|compact|table` for terminal workflows
- Exports Markdown, JSON, or HTML reports with dashboard filters
- Saves run history and supports diffs between scans
- Maintains a local SQLite scouting library from saved runs
- Supports bookmarks for repos you want to watch
- Loads defaults from `.repo-scout.json`
- Can produce an OpenClaw-friendly scouting brief
- Can generate a product spec or an OpenClaw execution prompt from a saved idea
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
- `library` — inspect the SQLite scouting library
- `bookmark` — save/list watched repos
- `spec` — generate a product spec from a saved idea
- `openclaw-prompt` — generate an OpenClaw execution prompt from a saved idea
- `config-init` — create a starter `.repo-scout.json`

## Example

```bash
node ./bin/repo-scout.js report --topic-pack agents --limit 10 --ideas 4 --out scout-report.html
node ./bin/repo-scout.js brief --topic-pack agents --limit 8 --ideas 3
node ./bin/repo-scout.js trending --topic-pack agents --days 30 --format table
node ./bin/repo-scout.js library top-repos --limit 10
node ./bin/repo-scout.js spec --latest --idea 1
node ./bin/repo-scout.js ideas "browser automation" --llm
```

## Terminal views

For `search`, `ideas`, `history`, and `trending`, you can choose:

```bash
--format full
--format compact
--format table
```

Examples:

```bash
node ./bin/repo-scout.js search "browser automation" --format table
node ./bin/repo-scout.js ideas --topic-pack agents --format compact
```

## SQLite library and bookmarks

Repo Scout now maintains a local library database at:

```text
.repo-scout-history/repo-scout.db
```

Use it like this:

```bash
node ./bin/repo-scout.js library top-repos --limit 10
node ./bin/repo-scout.js library ideas --limit 10
node ./bin/repo-scout.js bookmark add browser-use/browser-use --note "watch this"
node ./bin/repo-scout.js bookmark list
```

Note: Node's built-in SQLite currently prints an experimental warning on some runtimes.

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
- Better terminal UX / output modes ✅
- Saved run history / diff ✅
- Trending / rising-star detection ✅
- SQLite scouting library + bookmarks ✅
- Better HTML dashboard ✅
- Config file support ✅
- OpenClaw-friendly brief flow ✅
- Product spec + OpenClaw prompt generation ✅
- Optional LLM-powered summaries ✅ (best-effort endpoint mode)
