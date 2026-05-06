# Repo Scout Roadmap

## Done in MVP

- Public GitHub repo search by topic.
- Repo metadata profiling.
- Optional README analysis.
- Capability detection.
- 2-3 repo project-idea generation.
- Ranking by novelty, buildability, usefulness, popularity, freshness, and topic fit.
- Diversity pass to reduce repetitive top ideas.
- CLI commands: `search`, `ideas`, `report`, `packs`, `explain`.
- JSON and Markdown output with `--json`, `--markdown`, and `--out`.
- Local HTML dashboard/report output.
- Local response cache under `.repo-scout-cache/`.
- Example outputs in `examples/`.

## Next high-value improvements

1. Add saved-run history and a diff command for daily scouting.
2. Add optional `--format table|compact|full` terminal views.
3. Add SQLite saved repo/idea library.
4. Add LLM mode for higher-quality idea names and summaries.
5. Add embeddings/clustering so repo combinations are less heuristic.
6. Add GitHub trending/rising-star detection.
7. Add topic-pack import from a local config file.

## Known limitations

- Capability detection is heuristic and can still produce false positives.
- GitHub unauthenticated API rate limits can be hit; set `GITHUB_TOKEN` if needed.
- Idea generation is deterministic and template-based, even with the diversity pass.
- HTML reports are static snapshots, not a live web app.
