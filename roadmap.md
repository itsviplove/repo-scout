# Repo Scout Roadmap

## Current status

Repo Scout `v2.0.0` is now a **Scout-to-Startup OS with a local website mode**.

Current shipped pillars:
- GitHub repo search, profiling, trust scoring, and trend intelligence
- Saved scouting history with diffs and scouting memory
- SQLite-backed scouting library with bookmarks/watchlists
- Repeat-aware daily scouting and weekly scouting summaries
- Opportunity memory across idea families, themes, recurring repos, and startup opportunities
- Startup opportunity scoring and startup-thesis generation
- Founder workflow outputs: memos, next actions, specs, OpenClaw prompts
- Incubator promotion and decision logging
- Static dashboard generation and local website serving

## Shipped through v2.0.0

- Trust / confidence scoring with capability evidence and warnings ✅
- Stronger heuristics for toy/demo/template detection ✅
- Table / compact / full terminal output modes ✅
- Sharper idea framing with use-case, market angle, and differentiation output ✅
- Stronger trending labels and momentum scoring ✅
- Trend windows and richer trend watch sections ✅
- SQLite scouting library synced from saved runs ✅
- Bookmarks for watched repos ✅
- Better HTML summary cards and richer idea cards ✅
- `.repo-scout.json` config loading + `config-init` ✅
- Optional `--llm` idea enrichment via OpenClaw-compatible HTTP endpoint ✅
- Improved LLM auth/fallback messaging ✅
- `brief` command for OpenClaw-native scouting flow ✅
- `spec` and `openclaw-prompt` commands for agent execution handoff ✅
- `thesis`, `memo`, and `next-actions` founder outputs ✅
- Repeat-aware `daily-scout` digests with saved history ✅
- Commit/release-aware repo quality heuristics ✅
- Watchlist refresh / movers from bookmarks ✅
- Scoped library views for recurring repos, strongest topic lanes, idea families, opportunity themes, and startup opportunities ✅
- Weekly scouting briefs and schedule preview for automation planning ✅
- Opportunity scoring across repo quality, timing, and repeat strength ✅
- Startup-thesis generation for saved ideas ✅
- Stronger execution handoff in specs/prompts ✅
- `lane-report` for market-lane summaries ✅
- `promote`, `incubator`, and `decision` founder workflow tracking ✅
- `export` for memo/brief bundle generation ✅
- Local startup dashboard HTML view ✅
- Local website mode via `serve` with interactive scouting UI and JSON APIs ✅

## What v1.1 → v2.0 became in practice

### v1.1 themes completed
- better LLM ergonomics
- more useful founder-oriented outputs
- clearer best-next-step generation

### v1.2 themes completed
- deeper opportunity memory
- stronger repeated-opportunity surfacing
- better market-lane views

### v1.3 themes completed
- richer dashboard experience
- move from static-only output toward interactive review

### v1.4 themes completed
- exportable founder materials
- cleaner downstream handoff bundles

### v1.5 themes completed
- stronger automation planning with daily/weekly flows and schedule previews
- better machine-usable APIs and web-triggered scouting

### v2.0 themes completed
- founder pipeline operation layer
- incubator + decision log
- website mode so Repo Scout can be run as a product, not only a CLI

## Near-term follow-ups

- Improve thesis language quality so outputs sound more founder-grade and less heuristic
- Add richer website interactions for notes, filters, and saved opportunity states
- Add stronger market-size / category framing if a good lightweight source path appears
- Add better webhook/export paths for Discord, Notion, and docs workflows
- Consider a lightweight auth layer if the website ever needs remote exposure

## Longer-term direction

Repo Scout should keep evolving toward a daily founder operating system:
- stronger conviction tracking over time
- better idea-to-build pipeline management
- deeper lane intelligence and competition framing
- tighter automation hooks into other OpenClaw agents
- optional richer frontend if the local website becomes a main workflow surface
