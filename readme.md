# Repo Scout

[![GitHub release](https://img.shields.io/github/v/release/itsviplove/repo-scout)](https://github.com/itsviplove/repo-scout/releases)
[![License](https://img.shields.io/github/license/itsviplove/repo-scout)](https://github.com/itsviplove/repo-scout/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

Discover interesting public GitHub repositories and turn them into buildable project ideas.

## What it does

- Searches GitHub by topic or preset topic pack
- Fetches repo metadata and optional README content
- Profiles repos for capabilities, freshness, popularity, and integration potential
- Tracks star momentum / rising repos across saved runs
- Combines 2-3 repos into ranked project ideas
- Exports Markdown, JSON, or HTML reports with dashboard filters
- Saves run history and supports diffs between scans
- Caches API responses locally

## Quick start

```bash
cd repo-scout
node ./bin/repo-scout.js ideas "ai agents automation" --limit 12 --ideas 6
```

## Commands

- `packs` â€” list built-in topic packs
- `search` â€” search repos
- `explain` â€” inspect one repo
- `ideas` â€” generate ranked project ideas
- `report` â€” generate a static HTML report
- `trending` â€” show rising repos from saved history
- `history` â€” list saved runs
- `diff` â€” compare two saved runs

## Example

```bash
node ./bin/repo-scout.js report --topic-pack agents --limit 10 --ideas 4 --out scout-report.html
```

## Notes

- Node.js 18+ recommended
- No runtime dependencies
- Works best with `GITHUB_TOKEN` if rate limits appear

## Roadmap

- Saved run history and diff are in progress
- Trending / rising-star detection âœ…
- Better HTML dashboard âœ…
- Optional LLM-powered summaries
