# Repo Scout Roadmap

## Current status

- MVP is done and published.
- Public repo search, profiling, idea generation, and HTML reporting work.
- Repo trust scoring, trending, diffing, config loading, SQLite library persistence, repeat-aware daily scouting, weekly scouting summaries, and OpenClaw-native spec/prompt generation now work locally.

## Done in current enhancement pass

- Trust / confidence scoring with capability evidence and warnings ✅
- Stronger heuristics for toy/demo/template detection ✅
- Table / compact / full terminal output modes ✅
- Sharper idea framing with use-case output ✅
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
- Scoped library views for recurring repos, strongest topic lanes, idea families, and opportunity themes ✅
- Weekly scouting briefs and schedule preview for automation planning ✅
- Richer report sections for repo-quality breakdowns and watchlist context ✅

## Next release focus

- Better LLM auth/fallback handling and prompt presets
- Stronger idea-family scoring and cross-run differentiation tuning
- Deeper automation hooks for scheduled OpenClaw workflows
- Optional local dashboard / richer interactive UI

## v1.0 direction

Goal: evolve Repo Scout from a strong scouting CLI into a Scout-to-Startup OS.

Target v1.0 capabilities:
- opportunity scoring across repo quality, timing, and repeat strength
- startup-thesis generation for the best ideas
- stronger execution handoff into OpenClaw prompts/specs
- deeper clustering and opportunity-memory views
- automation-first weekly/daily scouting workflows
- optional local dashboard for review and decision-making

## Later

- embeddings/clustering
- startup-thesis generation
- full Scout-to-Startup OS / v1.0 execution layer
