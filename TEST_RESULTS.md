# Repo Scout Test Results

Date: 2026-05-05

## Commands run

### 1) Syntax check
```bash
node --check .\bin\repo-scout.js
```
Result: passed

### 2) Topic pack listing
```bash
node .\bin\repo-scout.js packs
```
Result: passed

### 3) Search with docs topic pack
```bash
node .\bin\repo-scout.js search --topic-pack docs --limit 3
```
Result: passed

Observed sample results:
- `opendatalab/MinerU`
- `opendataloader-project/opendataloader-pdf`
- `CatchTheTornado/text-extract-api`

### 4) Explain a real public repo
```bash
node .\bin\repo-scout.js explain browser-use/browser-use
```
Result: passed

Observed:
- repo metadata fetched successfully
- README analysis worked
- capability detection included browser automation, agent orchestration, workflow automation

### 5) CLI smoke test for ideas
```bash
npm run smoke
```
Result: passed

Observed:
- analyzed 8 repos
- generated 3 ranked ideas
- diversity pass produced varied titles instead of exact repeats

### 6) HTML report smoke test
```bash
npm run smoke:report
```
Result: passed

Output:
- `examples/overnight-report.html`

Observed:
- static HTML dashboard was written locally
- report contains summary stats, capability badges, ranked ideas, and a repo table

## Notes

- Tests used only public GitHub reads and local file writes.
- Results will vary over time because GitHub search rankings and repository metadata change.
- Without `GITHUB_TOKEN`, larger or repeated runs may still hit GitHub rate limits.
