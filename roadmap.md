# Repo Scout Roadmap

## Current status

- MVP is done and published.
- Public repo search, profiling, idea generation, and HTML reporting work.
- Repo trust scoring, trending, diffing, config loading, and OpenClaw-friendly brief generation now work locally.

## Done in current enhancement pass

- Trust / confidence scoring with capability evidence and warnings ✅
- Stronger trending labels and momentum scoring ✅
- Better HTML summary cards and richer idea cards ✅
- `.repo-scout.json` config loading + `config-init` ✅
- Optional `--llm` idea enrichment via OpenClaw-compatible HTTP endpoint ✅
- `brief` command for OpenClaw-native scouting flow ✅

## Next release focus

- Improve capability heuristics to reduce false positives further
- Add table/compact terminal views
- Add richer report sections for repo-quality breakdowns
- Add better LLM fallback/error handling and prompt presets

## Later

- SQLite library
- embeddings/clustering
- scheduled/OpenClaw automation flows
