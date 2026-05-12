# Repo Scout Roadmap

## Current status

Repo Scout `v1.0.0` is now scoped as a **Scout-to-Startup OS** rather than just a GitHub scouting CLI.

Current shipped pillars:
- GitHub repo search, profiling, and trust scoring
- Saved scouting history with diffs and trending
- SQLite-backed scouting library with bookmarks/watchlists
- Repeat-aware daily scouting and weekly scouting summaries
- Opportunity memory across idea families, themes, and recurring repos
- Startup opportunity scoring and startup-thesis generation
- Execution handoff outputs for product specs and OpenClaw prompts
- Optional local startup dashboard HTML output

## Shipped through v1.0.0

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
- `brief` command for OpenClaw-native scouting flow ✅
- `spec` and `openclaw-prompt` commands for agent execution handoff ✅
- Repeat-aware `daily-scout` digests with saved history ✅
- Commit/release-aware repo quality heuristics ✅
- Watchlist refresh / movers from bookmarks ✅
- Scoped library views for recurring repos, strongest topic lanes, idea families, opportunity themes, and startup opportunities ✅
- Weekly scouting briefs and schedule preview for automation planning ✅
- Opportunity scoring across repo quality, timing, and repeat strength ✅
- Startup-thesis generation for saved ideas ✅
- Stronger execution handoff in specs/prompts ✅
- Local startup dashboard HTML view ✅

## Near-term follow-ups

- Improve `--llm` auth/fallback ergonomics so OpenClaw enrichment is easier to use live
- Add more prompt presets for founder memo / investor memo / PRD style outputs
- Add deeper clustering or embeddings when a lightweight local option is worth the complexity
- Consider a richer interactive local dashboard if static HTML starts to feel limiting
- Add export helpers for Discord/email/Notion-style downstream workflows

## Longer-term direction

Repo Scout should keep pushing toward a full founder-research system:
- stronger opportunity memory
- richer market-lane comparisons
- sharper repeat suppression and novelty tracking
- automation hooks that can feed other OpenClaw agents cleanly
- optional lightweight UI for daily review and decision logging
