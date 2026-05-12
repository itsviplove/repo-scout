# Repo Scout Roadmap

## Current status

- MVP is done and published.
- Public repo search, profiling, idea generation, and HTML reporting work.
- Repo trust scoring, trending, diffing, config loading, SQLite library persistence, repeat-aware daily scouting, and OpenClaw-native spec/prompt generation now work locally.

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
- Watchlist refresh / movers from bookmarks ✅
- Scoped library views for recurring repos and strongest topic lanes ✅

## Next release focus

- Improve repo-quality signals with commit/release-aware heuristics
- Add richer report sections for repo-quality breakdowns and bookmarks
- Add better LLM auth/fallback handling and prompt presets
- Add best-idea family clustering and recurring opportunity themes

## Later

- embeddings/clustering
- scheduled/OpenClaw automation flows
- weekly scouting digests / cron-ready exports
