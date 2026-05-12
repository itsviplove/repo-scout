#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const VERSION = '0.3.0';
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(SCRIPT_DIR, '..');
const CACHE_DIR = path.join(PROJECT_DIR, '.repo-scout-cache');
const HISTORY_DIR = path.join(PROJECT_DIR, '.repo-scout-history');
const HISTORY_RUNS_DIR = path.join(HISTORY_DIR, 'runs');
const LIBRARY_DB_FILE = path.join(HISTORY_DIR, 'repo-scout.db');
const DEFAULT_CONFIG_FILE = '.repo-scout.json';
const DEFAULT_TOPICS = 'ai agents automation developer tools';
const STOPWORDS = new Set('the a an and or of to in for with on by from is are be as at it this that into your you ai llm open source github https http com org img alt src href badge shield true false null undefined user users repo repos repository get build second first production-ready platform use using based toolkit framework'.split(' '));
const NEGATIVE_SIGNAL_TERMS = ['awesome', 'curated', 'list of', 'boilerplate', 'template', 'starter', 'example', 'examples', 'demo', 'showcase', 'tutorial', 'course'];
const DOC_SIGNAL_TERMS = ['install', 'usage', 'quickstart', 'getting started', 'api', 'configuration', 'license', 'contributing'];
const WEAK_CODE_SIGNALS = ['hackathon', 'toy', 'sample', 'proof of concept', 'poc', 'boilerplate', 'starter kit'];
const QUALITY_SIGNAL_TERMS = ['production', 'production-ready', 'tests', 'benchmark', 'roadmap', 'changelog', 'migration'];
const DEFAULT_LLM_MODEL = process.env.OPENCLAW_MODEL || 'openclaw/default';
let libraryDbPromise = null;

const TOPIC_PACKS = {
  agents: 'ai agents automation developer tools',
  localfirst: 'local-first privacy knowledge notes offline sync',
  docs: 'pdf parser markdown ocr',
  browser: 'browser automation scraping web workflow forms',
  devtools: 'developer tools code search cli testing productivity',
  data: 'data pipeline analytics dashboard monitoring open source',
  research: 'research assistant web crawling citations knowledge graph'
};

const CAPABILITIES = [
  { key: 'browser automation', terms: ['browser automation', 'browser-use', 'selenium', 'playwright', 'puppeteer', 'web automation', 'automate browser'] },
  { key: 'web crawling', terms: ['crawl', 'crawler', 'scrape', 'scraper', 'extract', 'web data', 'spider'] },
  { key: 'agent orchestration', terms: ['agent', 'agents', 'multi-agent', 'workflow', 'orchestration', 'autonomous'] },
  { key: 'memory / knowledge', terms: ['memory', 'knowledge', 'rag', 'vector', 'embedding', 'notes', 'graph'] },
  { key: 'document intelligence', terms: ['pdf', 'document', 'ocr', 'parse', 'markdown', 'table', 'layout'] },
  { key: 'workflow automation', terms: ['workflow', 'automation', 'integration', 'trigger', 'pipeline', 'zapier'] },
  { key: 'local-first app', terms: ['local-first', 'offline', 'privacy', 'self-hosted', 'sqlite', 'sync'] },
  { key: 'computer vision', terms: ['vision', 'camera', 'image', 'video', 'detect', 'opencv'] },
  { key: 'developer tooling', terms: ['developer', 'code', 'cli', 'terminal', 'github', 'devtools', 'ide'] },
  { key: 'data visualization', terms: ['dashboard', 'visualization', 'charts', 'analytics', 'monitoring'] }
];

const IDEA_ARCHETYPES = [
  {
    title: 'Autonomous Research Agent',
    needs: ['web crawling', 'browser automation', 'memory / knowledge'],
    core: ['web crawling', 'browser automation'],
    pitch: 'researches topics across the web, extracts useful evidence, remembers findings, and produces cited briefs.',
    mvp: ['Search and crawl sources for a topic', 'Extract clean notes and URLs', 'Store a memory/profile for future runs', 'Export a cited Markdown brief']
  },
  {
    title: 'Self-Improving Coding Assistant Memory',
    needs: ['developer tooling', 'memory / knowledge', 'agent orchestration'],
    core: ['developer tooling'],
    pitch: 'learns repo-specific lessons from coding sessions and injects the right context before future work.',
    mvp: ['Index repo docs and prior logs', 'Extract conventions/mistakes/test commands', 'Retrieve relevant lessons per task', 'Generate a compact context pack']
  },
  {
    title: 'Document-to-Workflow Copilot',
    needs: ['document intelligence', 'workflow automation', 'agent orchestration'],
    core: ['document intelligence'],
    pitch: 'turns PDFs, forms, invoices, and SOPs into structured action items and automatable workflows.',
    mvp: ['Parse uploaded PDFs/docs', 'Detect dates, tasks, entities, and forms', 'Generate workflow steps', 'Ask approval before external actions']
  },
  {
    title: 'Local-First Knowledge OS',
    needs: ['local-first app', 'memory / knowledge', 'document intelligence'],
    core: ['local-first app'],
    pitch: 'keeps a private searchable knowledge base that ingests docs, notes, and web research locally.',
    mvp: ['Import markdown/PDF/web pages', 'Create structured notes', 'Link related concepts', 'Run local search and Q&A']
  },
  {
    title: 'Smart Home Vision Automator',
    needs: ['computer vision', 'workflow automation', 'local-first app'],
    core: ['computer vision'],
    pitch: 'uses private local vision events to trigger useful home automations without cloud dependency.',
    mvp: ['Connect one camera/event source', 'Detect simple events', 'Create rule-based automations', 'Show a local event timeline']
  },
  {
    title: 'Workflow Recorder for the Web',
    needs: ['browser automation', 'workflow automation', 'agent orchestration'],
    core: ['browser automation'],
    pitch: 'performs a web task once from natural language, then converts it into a repeatable workflow.',
    mvp: ['Run a browser task', 'Record actions and page states', 'Convert to reusable recipe', 'Schedule or rerun with parameters']
  },
  {
    title: 'GitHub Repo Scout + Idea Lab',
    needs: ['developer tooling', 'web crawling', 'memory / knowledge'],
    core: ['developer tooling', 'web crawling'],
    pitch: 'scans fast-moving repositories, profiles their capabilities, and combines them into ranked product ideas.',
    mvp: ['Search GitHub by topic', 'Profile repos from README metadata', 'Generate repo combinations', 'Rank ideas by novelty and buildability']
  }
];

function usage() {
  console.log(`repo-scout v${VERSION}\n\nUsage:\n  repo-scout search [topic] [--topic-pack pack] [--limit 10] [--min-stars 100] [--language TypeScript] [--days 365] [--sort stars|updated|fresh] [--format full|compact|table] [--json] [--markdown] [--out file]\n  repo-scout ideas [topic] [--topic-pack pack] [--limit 12] [--ideas 6] [--no-readme] [--llm] [--format full|compact|table] [--json] [--markdown] [--out file]\n  repo-scout report [topic] [--topic-pack pack] [--limit 12] [--ideas 6] [--llm] [--out report.html]\n  repo-scout brief [topic] [--topic-pack pack] [--limit 10] [--ideas 4] [--llm] [--json] [--markdown] [--out file]\n  repo-scout trending [topic] [--limit 10] [--days 30] [--format full|compact|table] [--json] [--markdown] [--out file]\n  repo-scout history [--limit 20] [--kind search|ideas|report|brief] [--topic topic] [--format full|compact|table]\n  repo-scout diff <oldRunId> <newRunId> [--json] [--markdown] [--out file]\n  repo-scout diff --latest [--json] [--markdown] [--kind kind] [--topic topic]\n  repo-scout explain owner/repo [--json] [--markdown] [--out file]\n  repo-scout library top-repos [--limit 10] [--topic topic]\n  repo-scout library ideas [--limit 10] [--topic topic]\n  repo-scout bookmark add owner/repo [--note text]\n  repo-scout bookmark list\n  repo-scout spec [--latest] [--topic topic] [--idea 1]\n  repo-scout openclaw-prompt [--latest] [--topic topic] [--idea 1]\n  repo-scout config-init [--force]\n  repo-scout packs\n\nExamples:\n  repo-scout ideas "ai agents automation" --format table\n  repo-scout ideas --topic-pack browser --ideas 5 --llm\n  repo-scout report --topic-pack agents --out scout-report.html\n  repo-scout brief --topic-pack devtools --llm\n  repo-scout trending --topic-pack agents --days 14\n  repo-scout history --limit 10 --format compact\n  repo-scout diff --latest --kind report\n  repo-scout library top-repos --limit 12\n  repo-scout bookmark add browser-use/browser-use --note "watch this for agent browsing"\n  repo-scout spec --latest --idea 1\n  repo-scout openclaw-prompt --latest --idea 1\n  repo-scout search "local-first knowledge" --limit 8 --min-stars 500\n  repo-scout explain browser-use/browser-use\n\nConfig:\n  ${DEFAULT_CONFIG_FILE} in the repo root or current working directory is loaded automatically.\n\nOptional env:\n  GITHUB_TOKEN           increases GitHub API rate limits\n  OPENCLAW_BASE_URL      optional OpenClaw/Gateway HTTP endpoint for --llm\n  OPENCLAW_GATEWAY_TOKEN optional Gateway bearer token\n  OPENCLAW_MODEL         model/agent alias for --llm (default: ${DEFAULT_LLM_MODEL})\n`);
}

function parseArgs(argv) {
  const [cmd = 'help', ...rest] = argv;
  const opts = { _: [] };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (!arg.startsWith('--')) { opts._.push(arg); continue; }
    const key = arg.slice(2);
    if (key.startsWith('no-')) { opts[key] = true; opts[key.slice(3)] = false; continue; }
    const next = rest[i + 1];
    if (!next || next.startsWith('--')) opts[key] = true;
    else { opts[key] = next; i++; }
  }
  return { cmd, opts };
}

function n(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'report';
}

function safeSlug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'run';
}

async function fileExists(target) {
  try {
    await readFile(target, 'utf8');
    return true;
  } catch {
    return false;
  }
}

async function loadConfigFile(explicitPath = '') {
  const candidates = [];
  if (explicitPath) candidates.push(path.resolve(process.cwd(), explicitPath));
  candidates.push(path.resolve(process.cwd(), DEFAULT_CONFIG_FILE));
  if (path.resolve(process.cwd()) !== PROJECT_DIR) {
    candidates.push(path.join(PROJECT_DIR, DEFAULT_CONFIG_FILE));
  }

  for (const candidate of candidates) {
    if (!(await fileExists(candidate))) continue;
    try {
      const raw = await readFile(candidate, 'utf8');
      const data = JSON.parse(raw);
      return { path: candidate, data };
    } catch (error) {
      throw new Error(`Could not parse config file ${candidate}: ${error.message}`);
    }
  }

  return { path: '', data: {} };
}

function applyConfigDefaults(opts = {}, config = {}) {
  const merged = { ...opts };
  for (const [key, value] of Object.entries(config || {})) {
    if (merged[key] === undefined && merged[toCliKey(key)] === undefined) {
      merged[key] = value;
    }
  }
  return merged;
}

function toCliKey(value = '') {
  return String(value).replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

async function writeDefaultConfig(force = false) {
  const target = path.resolve(process.cwd(), DEFAULT_CONFIG_FILE);
  if (!force && await fileExists(target)) {
    throw new Error(`${DEFAULT_CONFIG_FILE} already exists. Use --force to overwrite.`);
  }
  const template = {
    'topic-pack': 'agents',
    limit: 10,
    ideas: 4,
    'min-stars': 150,
    days: 365,
    sort: 'stars',
    'no-readme': false,
    llm: false,
    outputDir: 'examples'
  };
  await writeFile(target, JSON.stringify(template, null, 2) + '\n', 'utf8');
  return target;
}

function pickRunOpts(opts = {}) {
  const keys = ['topic-pack', 'limit', 'min-stars', 'language', 'days', 'sort', 'ideas', 'no-readme', 'json', 'markdown', 'out', 'llm', 'config', 'format'];
  const picked = {};
  for (const key of keys) {
    if (opts[key] !== undefined) picked[key] = opts[key];
  }
  return picked;
}

async function ensureHistoryDir() {
  await mkdir(HISTORY_RUNS_DIR, { recursive: true });
  return HISTORY_RUNS_DIR;
}

async function getLibraryDb() {
  if (!libraryDbPromise) {
    libraryDbPromise = (async () => {
      await ensureHistoryDir();
      const { DatabaseSync } = await import('node:sqlite');
      const db = new DatabaseSync(LIBRARY_DB_FILE);
      db.exec(`
        CREATE TABLE IF NOT EXISTS runs (
          id TEXT PRIMARY KEY,
          created_at TEXT,
          kind TEXT,
          topic TEXT,
          command_name TEXT,
          repo_count INTEGER,
          idea_count INTEGER,
          output TEXT
        );
        CREATE TABLE IF NOT EXISTS repos (
          run_id TEXT,
          full_name TEXT,
          url TEXT,
          language TEXT,
          stars INTEGER,
          confidence REAL,
          docs_quality REAL,
          maintenance REAL,
          capabilities TEXT,
          warnings TEXT,
          PRIMARY KEY (run_id, full_name)
        );
        CREATE TABLE IF NOT EXISTS ideas (
          run_id TEXT,
          idea_key TEXT,
          title TEXT,
          overall REAL,
          confidence REAL,
          market_angle TEXT,
          difficulty TEXT,
          risk TEXT,
          differentiation TEXT,
          PRIMARY KEY (run_id, idea_key)
        );
        CREATE TABLE IF NOT EXISTS bookmarks (
          full_name TEXT PRIMARY KEY,
          note TEXT,
          created_at TEXT,
          last_seen_run_id TEXT,
          stars INTEGER,
          confidence REAL,
          language TEXT,
          url TEXT
        );
      `);
      return db;
    })();
  }
  return libraryDbPromise;
}

async function syncRunToLibrary(run) {
  const db = await getLibraryDb();
  db.prepare(`INSERT OR REPLACE INTO runs (id, created_at, kind, topic, command_name, repo_count, idea_count, output)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(run.id, run.createdAt, run.kind, run.topic, run.command, run.profiles?.length || 0, run.ideas?.length || 0, run.output || null);

  db.prepare('DELETE FROM repos WHERE run_id = ?').run(run.id);
  db.prepare('DELETE FROM ideas WHERE run_id = ?').run(run.id);

  const repoStmt = db.prepare(`INSERT OR REPLACE INTO repos
    (run_id, full_name, url, language, stars, confidence, docs_quality, maintenance, capabilities, warnings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const repo of run.profiles || []) {
    repoStmt.run(
      run.id,
      repo.fullName,
      repo.url,
      repo.language,
      repo.stars || 0,
      repo.scores?.confidence || 0,
      repo.scores?.docsQuality || 0,
      repo.scores?.maintenance || 0,
      JSON.stringify(repo.capabilities || []),
      JSON.stringify(repo.warnings || []),
    );
  }

  const ideaStmt = db.prepare(`INSERT OR REPLACE INTO ideas
    (run_id, idea_key, title, overall, confidence, market_angle, difficulty, risk, differentiation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const idea of run.ideas || []) {
    ideaStmt.run(
      run.id,
      idea.key,
      idea.title,
      idea.scores?.overall || 0,
      idea.scores?.confidence || 0,
      idea.marketAngle || null,
      idea.difficulty || null,
      idea.risk || null,
      idea.differentiation || null,
    );
  }
}

function timeStampId(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function buildRunId(kind, topic, date = new Date()) {
  return `${timeStampId(date)}-${safeSlug(kind)}-${safeSlug(topic)}`;
}

function normalizeRepoForHistory(profile) {
  return {
    fullName: profile.fullName,
    url: profile.url,
    description: profile.description,
    stars: profile.stars,
    forks: profile.forks,
    language: profile.language,
    topics: profile.topics,
    pushedAt: profile.pushedAt,
    capabilities: profile.capabilities,
    capabilityMatches: profile.capabilityMatches,
    keywords: profile.keywords,
    warnings: profile.warnings,
    qualityTier: profile.qualityTier,
    scores: profile.scores,
  };
}

function normalizeIdeaForHistory(idea) {
  return {
    title: idea.title,
    repos: idea.repos,
    why: idea.why,
    pitch: idea.pitch,
    mvp: idea.mvp,
    capabilities: idea.capabilities,
    theme: idea.theme,
    families: idea.families,
    useCase: idea.useCase,
    marketAngle: idea.marketAngle,
    difficulty: idea.difficulty,
    risk: idea.risk,
    differentiation: idea.differentiation,
    scores: idea.scores,
    key: idea.key,
  };
}

function summarizeRunForHistory(run) {
  return {
    id: run.id,
    createdAt: run.createdAt,
    kind: run.kind,
    topic: run.topic,
    command: run.command,
    opts: run.opts,
    repoCount: run.profiles?.length || 0,
    ideaCount: run.ideas?.length || 0,
    topRepos: (run.profiles || []).slice(0, 3).map(repo => ({
      name: repo.fullName,
      stars: repo.stars,
      language: repo.language,
    })),
    topIdeas: (run.ideas || []).slice(0, 3).map(idea => ({
      title: idea.title,
      score: idea.scores?.overall,
    })),
    output: run.output || null,
    comparison: run.comparison || null,
  };
}

async function saveRunHistory(run) {
  await ensureHistoryDir();
  const file = path.join(HISTORY_RUNS_DIR, `${run.id}.json`);
  await writeFile(file, JSON.stringify(run, null, 2) + '\n', 'utf8');
  await syncRunToLibrary(run);
  return file;
}

async function listRunHistory({ limit = 20, kind = '', topic = '' } = {}) {
  await ensureHistoryDir();
  const entries = [];
  let files = [];
  try {
    files = await readdir(HISTORY_RUNS_DIR);
  } catch {
    files = [];
  }
  for (const file of files.filter(name => name.endsWith('.json')).sort().reverse()) {
    const full = path.join(HISTORY_RUNS_DIR, file);
    try {
      const raw = await readFile(full, 'utf8');
      const data = JSON.parse(raw);
      if (kind && data.kind !== kind) continue;
      if (topic && String(data.topic || '').toLowerCase() !== String(topic).toLowerCase()) continue;
      entries.push({ ...summarizeRunForHistory(data), file: full });
      if (entries.length >= limit) break;
    } catch {
      // ignore bad files
    }
  }
  return entries;
}

async function loadRunHistory(runId) {
  await ensureHistoryDir();
  const file = path.join(HISTORY_RUNS_DIR, `${runId}.json`);
  const raw = await readFile(file, 'utf8');
  return JSON.parse(raw);
}

function compareRuns(oldRun, newRun) {
  const oldRepos = new Map((oldRun.profiles || []).map(repo => [repo.fullName, repo]));
  const newRepos = new Map((newRun.profiles || []).map(repo => [repo.fullName, repo]));
  const added = [...newRepos.values()].filter(repo => !oldRepos.has(repo.fullName));
  const removed = [...oldRepos.values()].filter(repo => !newRepos.has(repo.fullName));
  const shared = [...newRepos.values()].filter(repo => oldRepos.has(repo.fullName));
  const starChanges = shared
    .map(repo => {
      const prev = oldRepos.get(repo.fullName);
      const delta = (repo.stars || 0) - (prev?.stars || 0);
      return delta === 0 ? null : { name: repo.fullName, oldStars: prev?.stars || 0, newStars: repo.stars || 0, delta };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return {
    from: { id: oldRun.id, createdAt: oldRun.createdAt, kind: oldRun.kind, topic: oldRun.topic },
    to: { id: newRun.id, createdAt: newRun.createdAt, kind: newRun.kind, topic: newRun.topic },
    repoCountDelta: (newRun.profiles || []).length - (oldRun.profiles || []).length,
    ideaCountDelta: (newRun.ideas || []).length - (oldRun.ideas || []).length,
    added: added.map(normalizeRepoForHistory),
    removed: removed.map(normalizeRepoForHistory),
    starChanges,
  };
}

function resolveTopic(opts = {}) {
  const inlineTopic = opts._.join(' ').trim();
  if (inlineTopic) return inlineTopic;
  const pack = opts['topic-pack'];
  if (pack) {
    const key = String(pack).toLowerCase();
    if (!TOPIC_PACKS[key]) throw new Error(`Unknown topic pack "${pack}". Try: ${Object.keys(TOPIC_PACKS).join(', ')}`);
    return TOPIC_PACKS[key];
  }
  return DEFAULT_TOPICS;
}

async function cachedJson(key, ttlMs, producer) {
  await mkdir(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `${crypto.createHash('sha1').update(key).digest('hex')}.json`);
  if (existsSync(file)) {
    try {
      const data = JSON.parse(await readFile(file, 'utf8'));
      if (Date.now() - data.time < ttlMs) return data.value;
    } catch {}
  }
  const value = await producer();
  await writeFile(file, JSON.stringify({ time: Date.now(), value }, null, 2));
  return value;
}

async function github(pathname, accept = 'application/vnd.github+json') {
  const res = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      Accept: accept,
      'User-Agent': 'repo-scout-cli',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {})
    }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status} for ${pathname}: ${body.slice(0, 220)}`);
  }
  return accept.includes('raw') ? res.text() : res.json();
}

function buildQuery(topic, opts = {}) {
  const parts = [topic || DEFAULT_TOPICS, 'archived:false', 'fork:false'];
  const minStars = n(opts['min-stars'], 100);
  if (minStars > 0) parts.push(`stars:>=${minStars}`);
  if (opts.language) parts.push(`language:${opts.language}`);
  if (opts.days) {
    const d = new Date(Date.now() - n(opts.days, 365) * 86400000).toISOString().slice(0, 10);
    parts.push(`pushed:>=${d}`);
  }
  return parts.join(' ');
}

async function searchRepos(topic, opts = {}) {
  const limit = Math.min(n(opts.limit, 12), 30);
  const query = encodeURIComponent(buildQuery(topic, opts));
  const sort = ['updated', 'stars'].includes(opts.sort) ? opts.sort : 'stars';
  const data = await cachedJson(`search:${query}:${limit}:${sort}`, 15 * 60_000, () => github(`/search/repositories?q=${query}&sort=${sort}&order=desc&per_page=${limit}`));
  const items = data.items || [];
  return opts.sort === 'fresh'
    ? items.sort((a, b) => new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0))
    : items;
}

async function getReadme(fullName) {
  return cachedJson(`readme:${fullName}`, 24 * 60 * 60_000, async () => {
    try { return await github(`/repos/${fullName}/readme`, 'application/vnd.github.raw'); }
    catch { return ''; }
  });
}

async function getRepo(fullName) {
  return cachedJson(`repo:${fullName}`, 30 * 60_000, () => github(`/repos/${fullName}`));
}

function topKeywords(text, count = 8) {
  const freq = new Map();
  const cleaned = text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  const words = cleaned.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || [];
  for (const w of words) {
    if (STOPWORDS.has(w) || w.length > 28 || /^\d+$/.test(w) || w.includes('--')) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, count).map(([w]) => w);
}

function detectCapabilityMatches(repo, readme = '') {
  const hay = `${repo.name} ${repo.full_name} ${repo.description || ''} ${(repo.topics || []).join(' ')} ${readme.slice(0, 9000)}`.toLowerCase();
  const scored = CAPABILITIES.map(cap => ({
    key: cap.key,
    matches: cap.terms.filter(term => hay.includes(term)),
  }))
    .map(item => ({ ...item, score: item.matches.length }))
    .filter(item => item.score >= 1)
    .sort((a, b) => b.score - a.score);
  const normalized = scored
    .map(item => ({
      key: item.key,
      score: item.matches.length,
      evidence: item.matches.slice(0, 4),
    }))
    .filter(item => item.score >= 1)
    .sort((a, b) => b.score - a.score);
  return normalized.slice(0, 4);
}

function detectCapabilities(repo, readme = '') {
  return detectCapabilityMatches(repo, readme).map(item => item.key);
}

function docsSignals(readme = '', repo = {}) {
  const lower = readme.toLowerCase();
  const signalCount = DOC_SIGNAL_TERMS.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0);
  const qualityHits = QUALITY_SIGNAL_TERMS.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0);
  const readmeLength = readme.length;
  const descriptionBonus = repo.description ? 1.2 : 0;
  const topicBonus = Math.min(1.5, (repo.topics || []).length * 0.25);
  const lengthScore = Math.min(5, readmeLength / 800);
  return round(Math.min(10, lengthScore + signalCount * 0.8 + qualityHits * 0.45 + descriptionBonus + topicBonus));
}

function maintenanceSignals(repo = {}) {
  const pushedDays = repo.pushed_at ? Math.round((Date.now() - new Date(repo.pushed_at).getTime()) / 86400000) : 9999;
  const recencyScore = Math.max(0, 10 - Math.min(10, pushedDays / 45));
  const forkSignal = Math.min(2.5, Math.log10((repo.forks_count || 0) + 1) * 1.3);
  const issuePenalty = Math.min(2, Math.log10((repo.open_issues_count || 0) + 1));
  return round(Math.max(0, Math.min(10, recencyScore + forkSignal - issuePenalty * 0.35)));
}

function qualitySignals(repo = {}, readme = '', caps = [], matches = []) {
  const hay = `${repo.name} ${repo.full_name} ${repo.description || ''} ${readme.slice(0, 4000)}`.toLowerCase();
  const negativeHits = NEGATIVE_SIGNAL_TERMS.filter(term => hay.includes(term));
  const weakCodeHits = WEAK_CODE_SIGNALS.filter(term => hay.includes(term));
  const docsQuality = docsSignals(readme, repo);
  const maintenance = maintenanceSignals(repo);
  const capabilityConfidence = round(Math.min(10, matches.reduce((sum, item) => sum + Math.min(2.2, item.score * 1.4), 0)));
  const repoMaturity = round(Math.min(10,
    Math.log10((repo.stargazers_count || 0) + 1) * 1.7 +
    Math.log10((repo.forks_count || 0) + 1) * 1.4 +
    (repo.homepage ? 0.6 : 0) +
    (repo.license ? 0.8 : 0)
  ));
  const confidence = round(Math.max(0, Math.min(10,
    docsQuality * 0.28 + maintenance * 0.24 + capabilityConfidence * 0.26 + repoMaturity * 0.18 - negativeHits.length * 0.45 - weakCodeHits.length * 0.35
  )));
  const warnings = [];
  if (!repo.description) warnings.push('missing description');
  if (readme.length < 400) warnings.push('thin README');
  if (negativeHits.length) warnings.push(`possible demo/template signals: ${negativeHits.slice(0, 3).join(', ')}`);
  if (weakCodeHits.length) warnings.push(`possible toy/sample signals: ${weakCodeHits.slice(0, 3).join(', ')}`);
  if ((repo.stargazers_count || 0) < 50) warnings.push('low adoption signal');
  if (maintenance < 4) warnings.push('maintenance looks weak');
  if (!caps.length) warnings.push('capabilities inferred weakly');
  const tier = confidence >= 8 ? 'strong' : confidence >= 6 ? 'promising' : confidence >= 4.5 ? 'watch' : 'weak';
  return { docsQuality, maintenance, capabilityConfidence, repoMaturity, confidence, warnings, tier };
}

function profileRepo(repo, readme = '') {
  const text = `${repo.description || ''}\n${(repo.topics || []).join(' ')}\n${readme.slice(0, 6000)}`;
  const capabilityMatches = detectCapabilityMatches(repo, readme);
  const caps = capabilityMatches.map(item => item.key);
  const pushedDays = repo.pushed_at ? Math.round((Date.now() - new Date(repo.pushed_at).getTime()) / 86400000) : 9999;
  const freshness = Math.max(0, 10 - Math.min(10, pushedDays / 30));
  const popularity = Math.min(10, Math.log10((repo.stargazers_count || 1) + 1) * 2);
  const integration = Math.min(10, caps.length * 2 + ((repo.topics || []).length > 4 ? 1 : 0) + (readme.length > 1000 ? 1 : 0));
  const trust = qualitySignals(repo, readme, caps, capabilityMatches);
  return {
    fullName: repo.full_name,
    url: repo.html_url,
    description: repo.description || 'No description.',
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    language: repo.language || 'Unknown',
    topics: repo.topics || [],
    pushedAt: repo.pushed_at,
    capabilities: caps.length ? caps : ['general utility'],
    capabilityMatches,
    keywords: topKeywords(text),
    warnings: trust.warnings,
    qualityTier: trust.tier,
    scores: {
      freshness: round(freshness),
      popularity: round(popularity),
      integration: round(integration),
      docsQuality: trust.docsQuality,
      maintenance: trust.maintenance,
      capabilityConfidence: trust.capabilityConfidence,
      repoMaturity: trust.repoMaturity,
      confidence: trust.confidence,
      breakdown: {
        docsQuality: trust.docsQuality,
        maintenance: trust.maintenance,
        capabilityConfidence: trust.capabilityConfidence,
        repoMaturity: trust.repoMaturity,
      }
    }
  };
}

function round(x) { return Math.round(x * 10) / 10; }

function overlap(a, b) { return a.filter(x => b.includes(x)); }
function union(arrays) { return [...new Set(arrays.flat())]; }

function topicBoost(topic, title) {
  const t = (topic || '').toLowerCase();
  if (/local|offline|private|knowledge|notes/.test(t) && title === 'Local-First Knowledge OS') return 1.2;
  if (/browser|web automation|form|website/.test(t) && title === 'Workflow Recorder for the Web') return 1.1;
  if (/research|crawl|scrape|web/.test(t) && title === 'Autonomous Research Agent') return 1.0;
  if (/code|coding|developer|devtool|repo/.test(t) && title === 'Self-Improving Coding Assistant Memory') return 1.0;
  if (/github|repo|idea|startup|project/.test(t) && title === 'GitHub Repo Scout + Idea Lab') return 1.2;
  if (/pdf|document|invoice|paper|form/.test(t) && title === 'Document-to-Workflow Copilot') return 1.2;
  if (/home|camera|vision|video/.test(t) && title === 'Smart Home Vision Automator') return 1.2;
  return 0;
}

function capabilityFamilies(caps) {
  const families = [];
  if (caps.includes('browser automation') || caps.includes('web crawling')) families.push('web');
  if (caps.includes('memory / knowledge') || caps.includes('local-first app')) families.push('knowledge');
  if (caps.includes('document intelligence')) families.push('documents');
  if (caps.includes('workflow automation') || caps.includes('agent orchestration')) families.push('automation');
  if (caps.includes('developer tooling')) families.push('developer');
  if (caps.includes('computer vision')) families.push('vision');
  if (caps.includes('data visualization')) families.push('analytics');
  return [...new Set(families)];
}

function pickThemeWords(words, caps) {
  const pool = [...new Set([...words, ...caps.flatMap(cap => cap.split(/[\s/]+/))])]
    .filter(Boolean)
    .filter(word => word.length > 3 && !STOPWORDS.has(word.toLowerCase()));
  return pool.slice(0, 3);
}

function generateIdeas(profiles, maxIdeas = 6, topic = '') {
  const ideas = [];
  const combos = [];
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) combos.push([profiles[i], profiles[j]]);
  }
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      for (let k = j + 1; k < Math.min(profiles.length, j + 4); k++) combos.push([profiles[i], profiles[j], profiles[k]]);
    }
  }

  for (const combo of combos) {
    const caps = union(combo.map(p => p.capabilities));
    const capCounts = new Map();
    for (const p of combo) for (const cap of p.capabilities) capCounts.set(cap, (capCounts.get(cap) || 0) + 1);
    const archetype = IDEA_ARCHETYPES
      .map(a => ({
        ...a,
        match: overlap(a.needs, caps).length,
        coreHits: overlap(a.core || [], caps).length,
        weight: a.needs.reduce((sum, need) => sum + (capCounts.get(need) || 0), 0)
      }))
      .filter(a => a.match >= 2 && (!a.core || a.coreHits > 0))
      .sort((a, b) => (b.weight + b.match + b.coreHits * 0.5) - (a.weight + a.match + a.coreHits * 0.5))[0];
    if (!archetype || archetype.match < 2) continue;

    const capDiversity = caps.length;
    const avgPopularity = combo.reduce((s, p) => s + p.scores.popularity, 0) / combo.length;
    const avgFreshness = combo.reduce((s, p) => s + p.scores.freshness, 0) / combo.length;
    const avgConfidence = combo.reduce((s, p) => s + (p.scores.confidence || 0), 0) / combo.length;
    const complement = archetype.match * 2 + capDiversity;
    const rawScore = complement * 1.15 + avgPopularity * 0.65 + avgFreshness * 0.45 + avgConfidence * 0.8;
    const score = Math.min(10, round(rawScore / 3 + topicBoost(topic, archetype.title)));
    const repoNames = combo.map(p => p.fullName).join(' + ');
    const uniqueWords = topKeywords(combo.map(p => `${p.description} ${p.keywords.join(' ')}`).join(' '), 5);
    const families = capabilityFamilies(caps);
    const buildability = Math.max(4, Math.min(10, round(11 - combo.length + archetype.match / 2 - Math.max(0, caps.length - 4) * 0.4)));
    const breakdown = scoreBreakdownForIdea(combo, archetype, caps, topic);
    const repeatedFamilies = families.length <= 1;
    const adjustedOverall = Math.max(0, round(score - (repeatedFamilies ? 0.4 : 0)));

    ideas.push({
      title: customizeTitle(archetype.title, uniqueWords, caps, topic),
      repos: combo.map(p => ({ name: p.fullName, url: p.url, capability: p.capabilities[0] })),
      why: combo.map(p => `${p.fullName} brings ${p.capabilities.slice(0, 2).join(' + ')}`).join('; '),
      pitch: `A ${archetype.pitch}`,
      mvp: archetype.mvp,
      capabilities: caps,
      theme: pickThemeWords(uniqueWords, caps).join(', '),
      families,
      marketAngle: marketAngleForFamilies(families, topic),
      useCase: likelyUseCase(combo, families, topic),
      difficulty: difficultyLabel(buildability),
      risk: ideaRiskSummary(combo, caps),
      differentiation: differentiationSummary(combo, caps, topic),
      scores: {
        overall: adjustedOverall,
        novelty: Math.min(10, round(capDiversity + archetype.match + (combo.length === 3 ? 1 : 0))),
        buildability,
        usefulness: Math.min(10, round(archetype.match * 2 + avgPopularity / 2)),
        confidence: round(avgConfidence),
        marketReadiness: Math.min(10, round(avgConfidence * 0.45 + avgPopularity * 0.35 + avgFreshness * 0.2)),
        breakdown,
      },
      key: `${archetype.title}:${repoNames}`
    });
  }

  return diversifyIdeas(ideas, maxIdeas);
}

function diversifyIdeas(ideas, maxIdeas) {
  const ranked = ideas.sort((a, b) => b.scores.overall - a.scores.overall);
  const picked = [];
  const seenTitles = new Set();
  for (const idea of ranked) {
    if (picked.length >= maxIdeas) break;
    const similarity = Math.max(0, ...picked.map(existing => ideaSimilarity(existing, idea)));
    const adjusted = round(idea.scores.overall - similarity * 1.4);
    if (adjusted < 5.5 && picked.length >= Math.max(2, Math.floor(maxIdeas / 2))) continue;
    if (seenTitles.has(idea.title)) continue;
    seenTitles.add(idea.title);
    picked.push({ ...idea, scores: { ...idea.scores, overall: adjusted } });
  }
  return picked.sort((a, b) => b.scores.overall - a.scores.overall);
}

function ideaSimilarity(a, b) {
  const sameRepos = overlap(a.repos.map(r => r.name), b.repos.map(r => r.name)).length / Math.max(a.repos.length, b.repos.length);
  const sameCaps = overlap(a.capabilities, b.capabilities).length / Math.max(a.capabilities.length, b.capabilities.length);
  const sameFamilies = overlap(a.families || [], b.families || []).length / Math.max(1, Math.max((a.families || []).length, (b.families || []).length));
  const titlePenalty = a.title === b.title ? 1 : 0;
  return round(sameRepos * 0.5 + sameCaps * 0.3 + sameFamilies * 0.2 + titlePenalty * 0.5);
}

function customizeTitle(base, words, caps, topic = '') {
  const topicWords = topKeywords(topic, 2);
  const themeWord = titleCase((topicWords[0] || words[0] || '').replace(/-/g, ' '));
  const descriptor = capabilityDescriptor(caps, topicWords[1] || words[1] || words[0] || '');
  if (base === 'GitHub Repo Scout + Idea Lab') {
    if (caps.includes('browser automation')) return 'Autonomous Web Project Scout';
    if (caps.includes('document intelligence')) return 'Technical Document Idea Lab';
    return themeWord ? `${themeWord} Repo Scout + Idea Lab` : base;
  }
  if (base === 'Autonomous Research Agent' && themeWord) return `${themeWord} Research Copilot`;
  if (base === 'Self-Improving Coding Assistant Memory') return `${descriptor} Coding Memory Copilot`;
  if (base === 'Local-First Knowledge OS' && /privacy|offline|notes|knowledge/.test(topic.toLowerCase())) return 'Private Knowledge Workspace';
  if (base === 'Document-to-Workflow Copilot' && themeWord) return `${themeWord} Intake Copilot`;
  if (base === 'Workflow Recorder for the Web') return `${descriptor} Workflow Recorder`;
  if (base === 'Smart Home Vision Automator') return `${descriptor} Vision Automator`;
  return base;
}
function titleCase(s) { return s.slice(0, 1).toUpperCase() + s.slice(1).replace(/-/g, ' '); }

function capabilityDescriptor(caps, fallbackWord = '') {
  if (caps.includes('browser automation') && caps.includes('memory / knowledge')) return 'Web Knowledge';
  if (caps.includes('browser automation')) return 'Web Agent';
  if (caps.includes('document intelligence')) return 'Document';
  if (caps.includes('workflow automation')) return 'Workflow';
  if (caps.includes('memory / knowledge') || caps.includes('local-first app')) return 'Knowledge';
  if (caps.includes('computer vision')) return 'Vision';
  if (fallbackWord) return titleCase(fallbackWord.replace(/-/g, ' '));
  return 'Project';
}

function averageScore(profiles, key) {
  if (!profiles.length) return 0;
  return round(profiles.reduce((sum, profile) => sum + (profile.scores?.[key] || 0), 0) / profiles.length);
}

function difficultyLabel(buildability) {
  if (buildability >= 8.5) return 'easy';
  if (buildability >= 7) return 'medium';
  return 'hard';
}

function marketAngleForFamilies(families = [], topic = '') {
  if (families.includes('developer')) return 'Developer workflow and team productivity';
  if (families.includes('knowledge')) return 'Knowledge workers and research-heavy teams';
  if (families.includes('documents')) return 'Ops teams with repetitive intake or review work';
  if (families.includes('vision')) return 'Monitoring, QA, or visual automation workflows';
  if (/repo|github|developer/.test(topic.toLowerCase())) return 'Developers exploring new tooling or automation';
  return 'Teams with repetitive research and integration work';
}

function likelyUseCase(combo = [], families = [], topic = '') {
  if (families.includes('developer')) return 'Internal devtools copilot or engineering team workflow product';
  if (families.includes('documents')) return 'Document intake, review, and operations workflow assistant';
  if (families.includes('knowledge')) return 'Research workspace or private knowledge assistant';
  if (/github|repo|startup/.test(topic.toLowerCase())) return 'Scouting and research workflow for founders or product teams';
  return `Applied workflow for ${topic || 'automation-heavy teams'}`;
}

function ideaRiskSummary(combo = [], caps = []) {
  const warnings = union(combo.map(profile => profile.warnings || []));
  if (warnings.some(item => /maintenance/i.test(item))) return 'Dependency quality risk: one or more repos look weakly maintained.';
  if (caps.length >= 5) return 'Scope risk: strong capability mix, but integration complexity is non-trivial.';
  if (combo.length >= 3) return 'Execution risk: three-repo combinations need sharper product focus.';
  return 'Main risk is differentiation rather than raw feasibility.';
}

function differentiationSummary(combo = [], caps = [], topic = '') {
  const repoNames = combo.map(profile => profile.fullName.split('/').pop()).slice(0, 3);
  const capabilityLine = caps.slice(0, 3).join(', ');
  return `Differentiate by packaging ${repoNames.join(' + ')} into a tighter ${topic || capabilityLine} workflow with opinionated defaults.`;
}

function scoreBreakdownForIdea(combo = [], archetype, caps = [], topic = '') {
  const avgPopularity = combo.reduce((sum, profile) => sum + (profile.scores?.popularity || 0), 0) / Math.max(1, combo.length);
  const avgFreshness = combo.reduce((sum, profile) => sum + (profile.scores?.freshness || 0), 0) / Math.max(1, combo.length);
  const avgConfidence = combo.reduce((sum, profile) => sum + (profile.scores?.confidence || 0), 0) / Math.max(1, combo.length);
  const capDiversity = caps.length;
  const complement = archetype.match * 2 + capDiversity;
  return {
    complement: round(complement),
    popularity: round(avgPopularity),
    freshness: round(avgFreshness),
    confidence: round(avgConfidence),
    topicFit: round(topicBoost(topic, archetype.title)),
  };
}

function trustSummary(profile) {
  const evidence = (profile.capabilityMatches || []).slice(0, 2).map(match => `${match.key}: ${match.evidence.join(', ')}`).join(' | ');
  return {
    confidence: profile.scores?.confidence || 0,
    docsQuality: profile.scores?.docsQuality || 0,
    maintenance: profile.scores?.maintenance || 0,
    evidence,
    warnings: profile.warnings || [],
  };
}

function outputFormat(opts = {}, fallback = 'full') {
  const format = String(opts.format || fallback).toLowerCase();
  return ['full', 'compact', 'table'].includes(format) ? format : fallback;
}

function printRepoList(profiles, opts = {}) {
  const format = outputFormat(opts, 'full');
  if (format === 'table') {
    console.table(profiles.map((profile, idx) => ({
      '#': idx + 1,
      repo: profile.fullName,
      stars: profile.stars,
      lang: profile.language,
      trust: profile.scores.confidence,
      tier: profile.qualityTier,
      fresh: profile.scores.freshness,
    })));
    return;
  }
  if (format === 'compact') {
    profiles.forEach((profile, idx) => {
      console.log(`${idx + 1}. ${profile.fullName} ★${profile.stars} ${profile.language} trust ${profile.scores.confidence}/10 (${profile.qualityTier})`);
    });
    return;
  }
  profiles.forEach((profile, idx) => printRepo(profile, idx + 1));
}

function printIdeaList(ideas, opts = {}) {
  const format = outputFormat(opts, 'full');
  if (format === 'table') {
    console.table(ideas.map((idea, idx) => ({
      '#': idx + 1,
      title: idea.title,
      overall: idea.scores.overall,
      confidence: idea.scores.confidence,
      difficulty: idea.difficulty,
      market: idea.marketAngle,
    })));
    return;
  }
  if (format === 'compact') {
    ideas.forEach((idea, idx) => {
      console.log(`${idx + 1}. ${idea.title} score ${idea.scores.overall}/10 | ${idea.difficulty} | ${idea.marketAngle}`);
    });
    return;
  }
  ideas.forEach((idea, idx) => printIdea(idea, idx + 1));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function printRepo(profile, i = null) {
  const prefix = i == null ? '' : `${i}. `;
  console.log(`${prefix}${profile.fullName}  ★ ${profile.stars}  ${profile.language}`);
  console.log(`   ${profile.description}`);
  console.log(`   Capabilities: ${profile.capabilities.join(', ')}`);
  console.log(`   Updated: ${profile.pushedAt ? profile.pushedAt.slice(0, 10) : 'unknown'} | Freshness: ${profile.scores.freshness}/10 | Confidence: ${profile.scores.confidence}/10 (${profile.qualityTier})`);
  console.log(`   Docs: ${profile.scores.docsQuality}/10 | Maintenance: ${profile.scores.maintenance}/10 | Capability evidence: ${profile.scores.capabilityConfidence}/10`);
  if (profile.capabilityMatches?.length) console.log(`   Evidence: ${profile.capabilityMatches.slice(0, 2).map(match => `${match.key} ⇢ ${match.evidence.join(', ')}`).join(' | ')}`);
  if (profile.warnings?.length) console.log(`   Warnings: ${profile.warnings.join('; ')}`);
  console.log(`   URL: ${profile.url}`);
}

function printIdea(idea, i) {
  console.log(`\n${i}. ${idea.title}  [overall ${idea.scores.overall}/10]`);
  console.log(`   Repos: ${idea.repos.map(r => r.name).join(' + ')}`);
  if (idea.theme) console.log(`   Theme: ${idea.theme}`);
  if (idea.marketAngle) console.log(`   Market: ${idea.marketAngle}`);
  if (idea.differentiation) console.log(`   Differentiation: ${idea.differentiation}`);
  console.log(`   Pitch: ${idea.pitch}`);
  console.log(`   Why: ${idea.why}`);
  console.log(`   Scores: novelty ${idea.scores.novelty}/10, buildability ${idea.scores.buildability}/10, usefulness ${idea.scores.usefulness}/10, confidence ${idea.scores.confidence}/10`);
  console.log(`   Difficulty: ${idea.difficulty} | Risk: ${idea.risk}`);
  console.log(`   MVP:`);
  for (const step of idea.mvp) console.log(`   - ${step}`);
}

function profileMarkdown(profile, i = null) {
  const head = i == null ? `## ${profile.fullName}` : `## ${i}. ${profile.fullName}`;
  return `${head}\n\n- **Stars:** ${profile.stars}\n- **Language:** ${profile.language}\n- **Updated:** ${profile.pushedAt ? profile.pushedAt.slice(0, 10) : 'unknown'}\n- **Freshness:** ${profile.scores.freshness}/10\n- **Confidence:** ${profile.scores.confidence}/10\n- **Docs quality:** ${profile.scores.docsQuality}/10\n- **Maintenance:** ${profile.scores.maintenance}/10\n- **Description:** ${profile.description}\n- **Capabilities:** ${profile.capabilities.join(', ')}\n- **Evidence:** ${(profile.capabilityMatches || []).slice(0, 2).map(match => `${match.key}: ${match.evidence.join(', ')}`).join(' | ') || 'none'}\n- **Warnings:** ${(profile.warnings || []).join('; ') || 'none'}\n- **URL:** ${profile.url}\n`;
}

function ideasMarkdown(topic, profiles, ideas) {
  const lines = [`# Repo Scout Ideas: ${topic}`, '', `Analyzed ${profiles.length} repositories.`, ''];
  ideas.forEach((idea, idx) => {
    lines.push(`## ${idx + 1}. ${idea.title}`, '');
    lines.push(`- **Repos:** ${idea.repos.map(r => `[${r.name}](${r.url})`).join(' + ')}`);
    lines.push(`- **Score:** ${idea.scores.overall}`);
    if (idea.theme) lines.push(`- **Theme:** ${idea.theme}`);
    if (idea.marketAngle) lines.push(`- **Market angle:** ${idea.marketAngle}`);
    if (idea.differentiation) lines.push(`- **Differentiation:** ${idea.differentiation}`);
    lines.push(`- **Scores:** novelty ${idea.scores.novelty}/10, buildability ${idea.scores.buildability}/10, usefulness ${idea.scores.usefulness}/10, confidence ${idea.scores.confidence}/10`);
    lines.push(`- **Difficulty:** ${idea.difficulty}`);
    lines.push(`- **Risk:** ${idea.risk}`);
    lines.push(`- **Pitch:** ${idea.pitch}`);
    lines.push(`- **Why:** ${idea.why}`);
    lines.push('', '**MVP:**');
    idea.mvp.forEach(step => lines.push(`- ${step}`));
    lines.push('');
  });
  return lines.join('\n');
}

function buildHtmlReport(topic, profiles, ideas, opts = {}, comparison = null, trending = []) {
  const generatedAt = new Date().toISOString();
  const topLanguages = [...new Set(profiles.map(profile => profile.language).filter(Boolean))].slice(0, 8);
  const totalStars = profiles.reduce((sum, profile) => sum + (profile.stars || 0), 0);
  const avgStars = profiles.length ? round(totalStars / profiles.length) : 0;
  const avgConfidence = averageScore(profiles, 'confidence');
  const avgDocs = averageScore(profiles, 'docsQuality');
  const avgMaintenance = averageScore(profiles, 'maintenance');
  const topRepos = profiles.slice(0, 6);
  const breakoutRepos = trending.filter(repo => repo.trendLabel === 'breakout').slice(0, 4);
  const newRepos = trending.filter(repo => repo.trendLabel === 'new this window').slice(0, 4);
  const watchlistRepos = trending.filter(repo => repo.trendLabel === 'watchlist').slice(0, 4);
  const capabilityCounts = new Map();
  for (const profile of profiles) for (const cap of profile.capabilities) capabilityCounts.set(cap, (capabilityCounts.get(cap) || 0) + 1);
  const capabilityBadges = [...capabilityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Repo Scout Report</title>
  <style>
    :root { color-scheme: dark; --bg:#0b1020; --panel:#141b34; --panel2:#0f1730; --text:#eef2ff; --muted:#9fb0d9; --accent:#7dd3fc; --good:#86efac; --warn:#fcd34d; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Segoe UI, Inter, Arial, sans-serif; background:linear-gradient(180deg, #0b1020, #111936 55%, #0b1020); color:var(--text); }
    .wrap { max-width:1180px; margin:0 auto; padding:32px 20px 56px; }
    .hero, .panel { background:rgba(20,27,52,.92); border:1px solid rgba(159,176,217,.18); border-radius:18px; box-shadow:0 12px 50px rgba(0,0,0,.24); }
    .hero { padding:28px; margin-bottom:20px; }
    h1, h2, h3, p { margin-top:0; }
    .muted { color:var(--muted); }
    .grid { display:grid; gap:16px; }
    .stats { grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); margin:18px 0; }
    .stat { padding:16px; background:var(--panel2); border-radius:14px; border:1px solid rgba(159,176,217,.12); }
    .num { font-size:28px; font-weight:700; }
    .badges, .repo-tags { display:flex; flex-wrap:wrap; gap:8px; }
    .badge { background:rgba(125,211,252,.12); color:#d9f4ff; border:1px solid rgba(125,211,252,.2); padding:6px 10px; border-radius:999px; font-size:13px; }
    .section { margin-top:18px; }
    .ideas { grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); }
    .panel { padding:18px; }
    .cards { grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); }
    .repo-card, .filterbar { background:rgba(15,23,48,.8); border:1px solid rgba(159,176,217,.12); border-radius:16px; }
    .repo-card { padding:16px; }
    .filterbar { padding:16px; display:grid; gap:12px; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); align-items:end; }
    .filterbar label { display:grid; gap:6px; font-size:13px; color:var(--muted); }
    .filterbar input, .filterbar select, .filterbar button { width:100%; padding:10px 12px; border-radius:10px; border:1px solid rgba(159,176,217,.16); background:#0c1327; color:var(--text); }
    .filterbar button { cursor:pointer; background:linear-gradient(180deg, rgba(125,211,252,.18), rgba(125,211,252,.08)); }
    .hidden { display:none !important; }
    .row-meta { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
    ol { padding-left:18px; }
    a { color:var(--accent); }
    table { width:100%; border-collapse:collapse; font-size:14px; }
    th, td { text-align:left; padding:10px 8px; border-bottom:1px solid rgba(159,176,217,.12); vertical-align:top; }
    .score { color:var(--good); font-weight:700; }
    .repo-name { font-weight:600; }
    .small { font-size:13px; }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>Repo Scout Report</h1>
      <p class="muted">Topic: <strong>${escapeHtml(topic)}</strong></p>
      <div class="grid stats">
        <div class="stat"><div class="num">${profiles.length}</div><div class="muted">Repos analyzed</div></div>
        <div class="stat"><div class="num">${ideas.length}</div><div class="muted">Ideas generated</div></div>
        <div class="stat"><div class="num">${Math.max(0, ...ideas.map(idea => idea.scores.overall))}</div><div class="muted">Top score</div></div>
        <div class="stat"><div class="num">${avgStars}</div><div class="muted">Avg stars</div></div>
        <div class="stat"><div class="num">${avgConfidence}</div><div class="muted">Avg trust</div></div>
        <div class="stat"><div class="num">${avgDocs}</div><div class="muted">Docs quality</div></div>
        <div class="stat"><div class="num">${avgMaintenance}</div><div class="muted">Maintenance</div></div>
      </div>
      <div class="badges">
        ${topLanguages.map(language => `<span class="badge">${escapeHtml(language)}</span>`).join('')}
      </div>
      <p class="muted small section">Generated at ${escapeHtml(generatedAt)}${opts['topic-pack'] ? ` · topic pack ${escapeHtml(opts['topic-pack'])}` : ''}</p>
    </section>

    <section class="panel section">
      <h2>Capability coverage</h2>
      <div class="badges">
        ${capabilityBadges.map(([cap, count]) => `<span class="badge">${escapeHtml(cap)} · ${count}</span>`).join('')}
      </div>
    </section>

    <section class="panel section">
      <h2>Dashboard filters</h2>
      <div class="filterbar">
        <label>
          Search
          <input id="repoFilterText" type="search" placeholder="name, description, capability..." />
        </label>
        <label>
          Language
          <select id="repoFilterLanguage">
            <option value="">Any</option>
            ${[...new Set(profiles.map(profile => profile.language).filter(Boolean))].sort().map(language => `<option value="${escapeHtml(language)}">${escapeHtml(language)}</option>`).join('')}
          </select>
        </label>
        <label>
          Min stars
          <input id="repoFilterStars" type="number" min="0" step="25" value="0" />
        </label>
        <label>
          Freshness
          <select id="repoFilterFreshness">
            <option value="0">Any</option>
            <option value="8">8+</option>
            <option value="6">6+</option>
            <option value="4">4+</option>
          </select>
        </label>
        <button id="repoFilterReset" type="button">Reset filters</button>
      </div>
    </section>

    <section class="section">
      <h2>Featured repositories</h2>
      <div class="grid cards">
        ${topRepos.map(profile => `
          <article class="repo-card" data-filterable="repo" data-name="${escapeHtml(profile.fullName.toLowerCase())}" data-language="${escapeHtml(profile.language)}" data-stars="${profile.stars}" data-freshness="${profile.scores.freshness}" data-search="${escapeHtml(`${profile.fullName} ${profile.description} ${(profile.capabilities || []).join(' ')} ${(profile.topics || []).join(' ')}`.toLowerCase())}">
            <h3><a href="${escapeHtml(profile.url)}">${escapeHtml(profile.fullName)}</a></h3>
            <p class="muted small">${escapeHtml(profile.description)}</p>
            <div class="row-meta">
              <span class="badge">★ ${profile.stars}</span>
              <span class="badge">${escapeHtml(profile.language)}</span>
              <span class="badge">fresh ${profile.scores.freshness}/10</span>
              <span class="badge">trust ${profile.scores.confidence}/10</span>
            </div>
            <div class="row-meta">${profile.capabilities.map(cap => `<span class="badge">${escapeHtml(cap)}</span>`).join('')}</div>
            ${profile.warnings?.length ? `<p class="muted small">Warnings: ${escapeHtml(profile.warnings.join('; '))}</p>` : ''}
          </article>`).join('')}
      </div>
    </section>

    ${trending.length ? `
    <section class="panel section">
      <h2>Rising repos</h2>
      <div class="grid cards">
        ${trending.map(repo => `
          <article class="repo-card" data-filterable="repo" data-name="${escapeHtml(repo.fullName.toLowerCase())}" data-language="${escapeHtml(repo.language || '')}" data-stars="${repo.stars}" data-freshness="10" data-search="${escapeHtml(`${repo.fullName} ${repo.description || ''} ${(repo.capabilities || []).join(' ')}`.toLowerCase())}">
            <h3><a href="${escapeHtml(repo.url)}">${escapeHtml(repo.fullName)}</a></h3>
            <p class="muted small">${escapeHtml(repo.description || '')}</p>
            <div class="row-meta">
              <span class="badge">${escapeHtml(repo.trendLabel)}</span>
              <span class="badge">trend ${repo.trendScore}</span>
              <span class="badge">Δ ${repo.lastDelta >= 0 ? '+' : ''}${repo.lastDelta}</span>
              <span class="badge">total ${repo.totalDelta >= 0 ? '+' : ''}${repo.totalDelta}</span>
              <span class="badge">★ ${repo.stars}</span>
            </div>
            <div class="row-meta">${(repo.capabilities || []).map(cap => `<span class="badge">${escapeHtml(cap)}</span>`).join('')}</div>
          </article>`).join('')}
      </div>
    </section>` : ''}

    ${trending.length ? `
    <section class="panel section">
      <h2>Trend watch</h2>
      <div class="grid ideas" style="grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));">
        <div class="panel" style="background:rgba(15,23,48,.8);">
          <h3>Breakout</h3>
          ${breakoutRepos.length ? `<ul>${breakoutRepos.map(repo => `<li>${escapeHtml(repo.fullName)} (+${repo.lastDelta})</li>`).join('')}</ul>` : '<p class="muted">None yet</p>'}
        </div>
        <div class="panel" style="background:rgba(15,23,48,.8);">
          <h3>New this window</h3>
          ${newRepos.length ? `<ul>${newRepos.map(repo => `<li>${escapeHtml(repo.fullName)} · age ${repo.ageDays}d</li>`).join('')}</ul>` : '<p class="muted">None yet</p>'}
        </div>
        <div class="panel" style="background:rgba(15,23,48,.8);">
          <h3>Watchlist</h3>
          ${watchlistRepos.length ? `<ul>${watchlistRepos.map(repo => `<li>${escapeHtml(repo.fullName)} · score ${repo.trendScore}</li>`).join('')}</ul>` : '<p class="muted">None yet</p>'}
        </div>
      </div>
    </section>` : ''}

    ${comparison ? `
    <section class="panel section">
      <h2>What changed since last scan</h2>
      <div class="grid stats">
        <div class="stat"><div class="num">${comparison.repoCountDelta >= 0 ? '+' : ''}${comparison.repoCountDelta}</div><div class="muted">Repo count delta</div></div>
        <div class="stat"><div class="num">${comparison.ideaCountDelta >= 0 ? '+' : ''}${comparison.ideaCountDelta}</div><div class="muted">Idea count delta</div></div>
        <div class="stat"><div class="num">${comparison.added.length}</div><div class="muted">New repos</div></div>
        <div class="stat"><div class="num">${comparison.removed.length}</div><div class="muted">Removed repos</div></div>
      </div>
      <p class="muted small">Compared ${escapeHtml(comparison.from.createdAt || comparison.from.id)} → ${escapeHtml(comparison.to.createdAt || comparison.to.id)}</p>
      <div class="grid ideas" style="grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));">
        <div class="panel" style="background:rgba(15,23,48,.8);">
          <h3>New repos</h3>
          ${comparison.added.length ? `<ul>${comparison.added.slice(0, 8).map(repo => `<li><a href="${escapeHtml(repo.url)}">${escapeHtml(repo.fullName)}</a> (${repo.stars} ★)</li>`).join('')}</ul>` : '<p class="muted">None</p>'}
        </div>
        <div class="panel" style="background:rgba(15,23,48,.8);">
          <h3>Removed repos</h3>
          ${comparison.removed.length ? `<ul>${comparison.removed.slice(0, 8).map(repo => `<li>${escapeHtml(repo.fullName)}</li>`).join('')}</ul>` : '<p class="muted">None</p>'}
        </div>
      </div>
      ${comparison.starChanges.length ? `
      <div class="panel" style="margin-top:14px; background:rgba(15,23,48,.8);">
        <h3>Star changes</h3>
        <ul>${comparison.starChanges.slice(0, 10).map(change => `<li>${escapeHtml(change.name)}: ${change.oldStars} → ${change.newStars} (${change.delta >= 0 ? '+' : ''}${change.delta})</li>`).join('')}</ul>
      </div>` : ''}
    </section>` : ''}

    <section class="section">
      <h2>Ranked ideas</h2>
      <div class="grid ideas">
        ${ideas.map((idea, idx) => `
          <article class="panel" data-filterable="idea" data-search="${escapeHtml(`${idea.title} ${idea.theme || ''} ${idea.pitch} ${idea.why} ${(idea.capabilities || []).join(' ')}`.toLowerCase())}">
            <h3>${idx + 1}. ${escapeHtml(idea.title)}</h3>
            <p class="score">Overall ${idea.scores.overall}/10</p>
            ${idea.theme ? `<p class="muted small">Theme: ${escapeHtml(idea.theme)}</p>` : ''}
            ${idea.marketAngle ? `<p class="muted small">Market: ${escapeHtml(idea.marketAngle)}</p>` : ''}
            <p>${escapeHtml(idea.pitch)}</p>
            <p class="small"><strong>Repos:</strong> ${idea.repos.map(repo => `<a href="${escapeHtml(repo.url)}">${escapeHtml(repo.name)}</a>`).join(' + ')}</p>
            <p class="small"><strong>Why:</strong> ${escapeHtml(idea.why)}</p>
            <p class="small"><strong>Differentiation:</strong> ${escapeHtml(idea.differentiation || '')}</p>
            <p class="small"><strong>Risk:</strong> ${escapeHtml(idea.risk || '')}</p>
            <div class="repo-tags">${idea.capabilities.map(cap => `<span class="badge">${escapeHtml(cap)}</span>`).join('')}</div>
            <p class="small section"><strong>Score mix:</strong> novelty ${idea.scores.novelty}/10 · buildability ${idea.scores.buildability}/10 · usefulness ${idea.scores.usefulness}/10 · confidence ${idea.scores.confidence}/10</p>
            <ol>
              ${idea.mvp.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
            </ol>
          </article>`).join('')}
      </div>
    </section>

    <section class="panel section">
      <h2>Repository snapshot</h2>
      <table>
        <thead>
          <tr><th>Repo</th><th>Stars</th><th>Language</th><th>Capabilities</th><th>Updated</th></tr>
        </thead>
        <tbody>
          ${profiles.map(profile => `
            <tr data-filterable="repo" data-name="${escapeHtml(profile.fullName.toLowerCase())}" data-language="${escapeHtml(profile.language)}" data-stars="${profile.stars}" data-freshness="${profile.scores.freshness}" data-search="${escapeHtml(`${profile.fullName} ${profile.description} ${(profile.capabilities || []).join(' ')} ${(profile.topics || []).join(' ')}`.toLowerCase())}">
              <td><a class="repo-name" href="${escapeHtml(profile.url)}">${escapeHtml(profile.fullName)}</a><div class="muted small">${escapeHtml(profile.description)}</div></td>
              <td>${profile.stars}</td>
              <td>${escapeHtml(profile.language)}</td>
              <td>${escapeHtml(profile.capabilities.join(', '))}</td>
              <td>${escapeHtml(profile.pushedAt ? profile.pushedAt.slice(0, 10) : 'unknown')}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </section>

    <script>
      (function () {
        const text = document.getElementById('repoFilterText');
        const language = document.getElementById('repoFilterLanguage');
        const stars = document.getElementById('repoFilterStars');
        const freshness = document.getElementById('repoFilterFreshness');
        const reset = document.getElementById('repoFilterReset');
        const items = document.querySelectorAll('[data-filterable="repo"]');

        function apply() {
          const q = (text?.value || '').trim().toLowerCase();
          const lang = (language?.value || '').trim();
          const minStars = Number(stars?.value || 0);
          const minFreshness = Number(freshness?.value || 0);
          items.forEach(el => {
            const search = (el.dataset.search || '');
            const itemLang = el.dataset.language || '';
            const itemStars = Number(el.dataset.stars || 0);
            const itemFreshness = Number(el.dataset.freshness || 0);
            const ok = (!q || search.includes(q)) && (!lang || itemLang === lang) && itemStars >= minStars && itemFreshness >= minFreshness;
            el.classList.toggle('hidden', !ok);
          });
        }

        [text, language, stars, freshness].forEach(el => el && el.addEventListener('input', apply));
        [language, freshness].forEach(el => el && el.addEventListener('change', apply));
        reset?.addEventListener('click', () => {
          if (text) text.value = '';
          if (language) language.value = '';
          if (stars) stars.value = '0';
          if (freshness) freshness.value = '0';
          apply();
        });
      })();
    </script>
  </div>
</body>
</html>`;
}

function historyMarkdown(entries) {
  const lines = ['# Repo Scout History', ''];
  if (!entries.length) return lines.concat(['No saved runs yet.']).join('\n');
  for (const entry of entries) {
    lines.push(`## ${entry.id}`, '');
    lines.push(`- **Time:** ${entry.createdAt}`);
    lines.push(`- **Kind:** ${entry.kind}`);
    lines.push(`- **Topic:** ${entry.topic}`);
    lines.push(`- **Repos:** ${entry.repoCount}`);
    lines.push(`- **Ideas:** ${entry.ideaCount}`);
    if (entry.topRepos?.length) lines.push(`- **Top repos:** ${entry.topRepos.map(repo => repo.name).join(', ')}`);
    if (entry.topIdeas?.length) lines.push(`- **Top ideas:** ${entry.topIdeas.map(idea => `${idea.title} (${idea.score}/10)`).join(', ')}`);
    if (entry.output) lines.push(`- **Output:** ${entry.output}`);
    lines.push('');
  }
  return lines.join('\n');
}

function printHistory(entries) {
  if (!entries.length) {
    console.log('\nNo saved runs yet.\n');
    return;
  }
  console.log('\nRepo Scout history\n');
  entries.forEach((entry, idx) => {
    console.log(`${idx + 1}. ${entry.createdAt} | ${entry.kind} | ${entry.topic}`);
    console.log(`   repos: ${entry.repoCount} | ideas: ${entry.ideaCount}`);
    if (entry.topRepos?.length) console.log(`   top repos: ${entry.topRepos.map(repo => repo.name).join(', ')}`);
    if (entry.topIdeas?.length) console.log(`   top ideas: ${entry.topIdeas.map(idea => `${idea.title} (${idea.score}/10)`).join(', ')}`);
    if (entry.output) console.log(`   output: ${entry.output}`);
  });
}

function diffMarkdown(diff) {
  const lines = [
    '# Repo Scout Diff',
    '',
    `- **From:** ${diff.from.createdAt} (${diff.from.kind} / ${diff.from.topic})`,
    `- **To:** ${diff.to.createdAt} (${diff.to.kind} / ${diff.to.topic})`,
    `- **Repo delta:** ${diff.repoCountDelta >= 0 ? '+' : ''}${diff.repoCountDelta}`,
    `- **Idea delta:** ${diff.ideaCountDelta >= 0 ? '+' : ''}${diff.ideaCountDelta}`,
    '',
    '## New repos',
    ...(diff.added.length ? diff.added.map(repo => `- [${repo.fullName}](${repo.url}) (${repo.stars} ★)`) : ['- None']),
    '',
    '## Removed repos',
    ...(diff.removed.length ? diff.removed.map(repo => `- ${repo.fullName}`) : ['- None']),
  ];
  if (diff.starChanges.length) {
    lines.push('', '## Star changes', ...diff.starChanges.map(change => `- ${change.name}: ${change.oldStars} → ${change.newStars} (${change.delta >= 0 ? '+' : ''}${change.delta})`));
  }
  return lines.join('\n');
}

function printDiff(diff) {
  console.log(`\nRepo Scout diff\n`);
  console.log(`From: ${diff.from.createdAt} (${diff.from.kind} / ${diff.from.topic})`);
  console.log(`To:   ${diff.to.createdAt} (${diff.to.kind} / ${diff.to.topic})`);
  console.log(`Repo delta: ${diff.repoCountDelta >= 0 ? '+' : ''}${diff.repoCountDelta}`);
  console.log(`Idea delta: ${diff.ideaCountDelta >= 0 ? '+' : ''}${diff.ideaCountDelta}`);
  console.log(`New repos: ${diff.added.length}`);
  diff.added.slice(0, 10).forEach(repo => console.log(`  + ${repo.fullName} (${repo.stars} ★)`));
  console.log(`Removed repos: ${diff.removed.length}`);
  diff.removed.slice(0, 10).forEach(repo => console.log(`  - ${repo.fullName}`));
  if (diff.starChanges.length) {
    console.log('Star changes:');
    diff.starChanges.slice(0, 10).forEach(change => console.log(`  * ${change.name}: ${change.oldStars} → ${change.newStars} (${change.delta >= 0 ? '+' : ''}${change.delta})`));
  }
}

async function latestRunFor(kind, topic) {
  const entries = await listRunHistory({ limit: 100, kind, topic });
  if (!entries.length) return null;
  const latest = entries[0];
  return loadRunHistory(latest.id);
}

async function collectTrendingRepos({ limit = 8, topic = '', days = 30 } = {}) {
  const summaries = await listRunHistory({ limit: 300, topic });
  const runs = [];
  for (const summary of summaries.slice().reverse()) {
    try {
      runs.push(await loadRunHistory(summary.id));
    } catch {
      // ignore unreadable history file
    }
  }
  const cutoffMs = days > 0 ? Date.now() - n(days, 30) * 86400000 : 0;
  const timeline = runs
    .filter(run => Array.isArray(run.profiles) && run.profiles.length)
    .filter(run => !cutoffMs || new Date(run.createdAt).getTime() >= cutoffMs)
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const byRepo = new Map();
  for (const run of timeline) {
    const runTime = new Date(run.createdAt).getTime();
    for (const repo of run.profiles) {
      const current = byRepo.get(repo.fullName) || {
        fullName: repo.fullName,
        url: repo.url,
        language: repo.language,
        description: repo.description,
        capabilities: repo.capabilities || [],
        firstSeen: run.createdAt,
        lastSeen: run.createdAt,
        history: []
      };
      current.language = repo.language || current.language;
      current.url = repo.url || current.url;
      current.description = repo.description || current.description;
      current.capabilities = repo.capabilities?.length ? repo.capabilities : current.capabilities;
      current.lastSeen = run.createdAt;
      current.history.push({
        runId: run.id,
        createdAt: run.createdAt,
        stars: repo.stars || 0,
        pushedAt: repo.pushedAt,
        topic: run.topic,
        time: runTime,
      });
      byRepo.set(repo.fullName, current);
    }
  }

  const trending = [];
  for (const entry of byRepo.values()) {
    if (entry.history.length < 2) continue;
    const history = entry.history.sort((a, b) => a.time - b.time);
    const deltas = [];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      const daySpan = Math.max(1 / 24, (curr.time - prev.time) / 86400000);
      const delta = (curr.stars || 0) - (prev.stars || 0);
      deltas.push({ delta, perDay: delta / daySpan, spanDays: daySpan });
    }
    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    const lastDelta = (latest.stars || 0) - (previous.stars || 0);
    const totalDelta = (latest.stars || 0) - (history[0].stars || 0);
    const avgPerDay = deltas.length ? deltas.reduce((sum, item) => sum + item.perDay, 0) / deltas.length : 0;
    const recentMomentum = deltas.slice(-3).reduce((sum, item) => sum + item.perDay, 0) / Math.max(1, Math.min(3, deltas.length));
    const ageDays = Math.max(1, (latest.time - history[0].time) / 86400000);
    const freshnessBoost = latest.pushedAt ? Math.max(0, 4 - Math.min(4, (Date.now() - new Date(latest.pushedAt).getTime()) / 86400000 / 30)) : 0;
    const breakout = lastDelta >= 25 || recentMomentum >= 10;
    const consistent = deltas.filter(item => item.delta > 0).length >= Math.max(2, Math.ceil(deltas.length * 0.6));
    const newThisWindow = ageDays <= Math.max(7, days * 0.35);
    const trendScore = round(Math.max(0, totalDelta) * 2 + Math.max(0, lastDelta) * 3 + Math.max(0, avgPerDay) * 2 + Math.max(0, recentMomentum) * 2 + freshnessBoost - Math.log10(ageDays + 1));
    trending.push({
      fullName: entry.fullName,
      url: entry.url,
      language: entry.language,
      description: entry.description,
      capabilities: entry.capabilities,
      stars: latest.stars || 0,
      previousStars: previous.stars || 0,
      lastDelta,
      totalDelta,
      avgPerDay: round(avgPerDay),
      recentMomentum: round(recentMomentum),
      trendScore,
      trendLabel: breakout ? 'breakout' : newThisWindow ? 'new this window' : consistent ? 'steady riser' : 'watchlist',
      firstSeen: entry.firstSeen,
      lastSeen: entry.lastSeen,
      appearances: history.length,
      ageDays: round(ageDays),
    });
  }

  return trending
    .sort((a, b) => (b.trendScore - a.trendScore) || (b.totalDelta - a.totalDelta) || (b.stars - a.stars))
    .slice(0, limit);
}

function printTrending(entries, topic = '') {
  const scope = topic ? ` for "${topic}"` : '';
  if (!entries.length) {
    console.log(`\nNo trending repos yet${scope}. Run a few scans over time to build history.\n`);
    return;
  }
  console.log(`\nTrending repos${scope}\n`);
  entries.forEach((repo, idx) => {
    console.log(`${idx + 1}. ${repo.fullName}  ★ ${repo.stars}  ${repo.language}`);
    console.log(`   ${repo.trendLabel} | Δ stars: ${repo.lastDelta >= 0 ? '+' : ''}${repo.lastDelta} | total: ${repo.totalDelta >= 0 ? '+' : ''}${repo.totalDelta} | score: ${repo.trendScore}`);
    console.log(`   seen: ${repo.appearances} runs | first: ${repo.firstSeen} | last: ${repo.lastSeen}`);
    console.log(`   ${repo.description}`);
  });
}

function trendingMarkdown(entries, topic = '') {
  const lines = [`# Repo Scout Trending${topic ? `: ${topic}` : ''}`, ''];
  if (!entries.length) return lines.concat(['No trending repos yet.']).join('\n');
  for (const repo of entries) {
    lines.push(`## ${repo.fullName}`, '');
    lines.push(`- **Stars:** ${repo.stars}`);
    lines.push(`- **Delta:** ${repo.lastDelta >= 0 ? '+' : ''}${repo.lastDelta}`);
    lines.push(`- **Total delta:** ${repo.totalDelta >= 0 ? '+' : ''}${repo.totalDelta}`);
    lines.push(`- **Trend score:** ${repo.trendScore}`);
    lines.push(`- **Trend label:** ${repo.trendLabel}`);
    lines.push(`- **Language:** ${repo.language}`);
    lines.push(`- **Appearances:** ${repo.appearances}`);
    lines.push(`- **Updated:** ${repo.lastSeen}`);
    lines.push(`- **URL:** ${repo.url}`, '');
  }
  return lines.join('\n');
}

function extractJsonBlock(text = '') {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  const objStart = text.indexOf('{');
  const objEnd = text.lastIndexOf('}');
  if (objStart >= 0 && objEnd > objStart) return text.slice(objStart, objEnd + 1);
  return text.trim();
}

async function maybeEnrichIdeasWithLlm(topic, profiles, ideas, opts = {}) {
  if (!opts.llm) return { ideas, llmMeta: null };
  const baseUrl = String(opts['openclaw-base-url'] || process.env.OPENCLAW_BASE_URL || '').trim();
  if (!baseUrl) {
    return {
      ideas,
      llmMeta: { ok: false, reason: 'OPENCLAW_BASE_URL not set; skipped LLM enrichment.' }
    };
  }

  const prompt = {
    topic,
    repos: profiles.slice(0, 8).map(profile => ({
      fullName: profile.fullName,
      description: profile.description,
      capabilities: profile.capabilities,
      confidence: profile.scores?.confidence,
      warnings: profile.warnings,
    })),
    ideas: ideas.map((idea, index) => ({
      index,
      key: idea.key,
      title: idea.title,
      pitch: idea.pitch,
      marketAngle: idea.marketAngle,
      risk: idea.risk,
      differentiation: idea.differentiation,
      difficulty: idea.difficulty,
    }))
  };

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.OPENCLAW_GATEWAY_TOKEN ? { Authorization: `Bearer ${process.env.OPENCLAW_GATEWAY_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      model: opts['openclaw-model'] || process.env.OPENCLAW_MODEL || DEFAULT_LLM_MODEL,
      messages: [
        { role: 'system', content: 'You are improving startup/research idea briefs. Return only strict JSON.' },
        { role: 'user', content: `Sharpen these repo-scout ideas. Return a JSON array with one item per idea, preserving index and key. For each item include: index, key, title, pitch, marketAngle, risk, differentiation, difficulty. Keep each field short, concrete, and non-hype. Input: ${JSON.stringify(prompt)}` }
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { ideas, llmMeta: { ok: false, reason: `LLM enrichment failed: ${res.status} ${body.slice(0, 160)}` } };
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';
  let parsed;
  try {
    parsed = JSON.parse(extractJsonBlock(content));
  } catch (error) {
    return { ideas, llmMeta: { ok: false, reason: `Could not parse LLM JSON: ${error.message}` } };
  }

  const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : [];
  const byKey = new Map(records.map(item => [item.key || `${item.index}`, item]));
  const enriched = ideas.map((idea, index) => {
    const item = byKey.get(idea.key) || byKey.get(String(index));
    if (!item) return idea;
    return {
      ...idea,
      title: item.title || idea.title,
      pitch: item.pitch || idea.pitch,
      marketAngle: item.marketAngle || idea.marketAngle,
      risk: item.risk || idea.risk,
      differentiation: item.differentiation || idea.differentiation,
      difficulty: item.difficulty || idea.difficulty,
    };
  });
  return { ideas: enriched, llmMeta: { ok: true, reason: 'Ideas enriched via OpenClaw-compatible LLM endpoint.' } };
}

function buildScoutBrief(topic, profiles, ideas, trending = [], llmMeta = null) {
  const topProfiles = profiles.slice(0, 5);
  const lines = [
    `# Repo Scout Brief: ${topic}`,
    '',
    `- Repos analyzed: ${profiles.length}`,
    `- Ideas generated: ${ideas.length}`,
    `- Avg trust: ${averageScore(profiles, 'confidence')}/10`,
  ];
  if (llmMeta) lines.push(`- LLM enrichment: ${llmMeta.ok ? 'enabled' : 'skipped'} (${llmMeta.reason})`);
  lines.push('', '## Best repos to inspect', '');
  topProfiles.forEach((profile, index) => {
    lines.push(`${index + 1}. **${profile.fullName}** — ${profile.description}`);
    lines.push(`   - trust ${profile.scores.confidence}/10 · docs ${profile.scores.docsQuality}/10 · maintenance ${profile.scores.maintenance}/10`);
    lines.push(`   - capabilities: ${profile.capabilities.join(', ')}`);
    if (profile.warnings?.length) lines.push(`   - warnings: ${profile.warnings.join('; ')}`);
  });
  if (trending.length) {
    lines.push('', '## Rising repos', '');
    trending.slice(0, 5).forEach((repo, index) => {
      lines.push(`${index + 1}. **${repo.fullName}** — ${repo.trendLabel}, Δ ${repo.lastDelta >= 0 ? '+' : ''}${repo.lastDelta}, total ${repo.totalDelta >= 0 ? '+' : ''}${repo.totalDelta}`);
    });
  }
  lines.push('', '## Best ideas', '');
  ideas.slice(0, 5).forEach((idea, index) => {
    lines.push(`${index + 1}. **${idea.title}** — score ${idea.scores.overall}/10`);
    lines.push(`   - pitch: ${idea.pitch}`);
    lines.push(`   - market: ${idea.marketAngle}`);
    lines.push(`   - difficulty: ${idea.difficulty}`);
    lines.push(`   - risk: ${idea.risk}`);
    lines.push(`   - differentiation: ${idea.differentiation}`);
  });
  lines.push('', '## Suggested next actions', '', '- Inspect the top 3 trust-scored repos in depth.', '- Re-run report after another scan to improve trending confidence.', '- Pick one idea with medium/easy difficulty and convert it into a product spec.');
  return lines.join('\n');
}

async function libraryTopRepos({ limit = 10, topic = '' } = {}) {
  const db = await getLibraryDb();
  const rows = db.prepare(`
    SELECT repos.full_name AS fullName, repos.language AS language, MAX(repos.stars) AS stars,
           ROUND(AVG(repos.confidence), 1) AS avgConfidence,
           ROUND(AVG(repos.docs_quality), 1) AS avgDocs,
           ROUND(AVG(repos.maintenance), 1) AS avgMaintenance,
           COUNT(*) AS appearances,
           MIN(runs.created_at) AS firstSeen,
           MAX(runs.created_at) AS lastSeen,
           MAX(repos.url) AS url
    FROM repos
    JOIN runs ON runs.id = repos.run_id
    WHERE (? = '' OR runs.topic = ?)
    GROUP BY repos.full_name, repos.language
    ORDER BY avgConfidence DESC, stars DESC, appearances DESC
    LIMIT ?
  `).all(topic, topic, limit);
  return rows.map(row => ({ ...row }));
}

async function libraryTopIdeas({ limit = 10, topic = '' } = {}) {
  const db = await getLibraryDb();
  return db.prepare(`
    SELECT ideas.title AS title,
           ROUND(AVG(ideas.overall), 1) AS avgOverall,
           ROUND(AVG(ideas.confidence), 1) AS avgConfidence,
           COUNT(*) AS appearances,
           MAX(ideas.market_angle) AS marketAngle,
           MAX(ideas.difficulty) AS difficulty,
           MAX(runs.topic) AS topic,
           MAX(runs.created_at) AS lastSeen
    FROM ideas
    JOIN runs ON runs.id = ideas.run_id
    WHERE (? = '' OR runs.topic = ?)
    GROUP BY ideas.title
    ORDER BY avgOverall DESC, avgConfidence DESC, appearances DESC
    LIMIT ?
  `).all(topic, topic, limit).map(row => ({ ...row }));
}

async function addBookmark(fullName, note = '') {
  const recent = await latestProfileForRepo(fullName);
  const db = await getLibraryDb();
  db.prepare(`INSERT OR REPLACE INTO bookmarks
    (full_name, note, created_at, last_seen_run_id, stars, confidence, language, url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      fullName,
      note || '',
      new Date().toISOString(),
      recent?.runId || null,
      recent?.stars || 0,
      recent?.confidence || 0,
      recent?.language || null,
      recent?.url || null,
    );
}

async function latestProfileForRepo(fullName) {
  const db = await getLibraryDb();
  return db.prepare(`
    SELECT repos.run_id AS runId, repos.full_name AS fullName, repos.stars AS stars, repos.confidence AS confidence,
           repos.language AS language, repos.url AS url, runs.created_at AS createdAt
    FROM repos JOIN runs ON runs.id = repos.run_id
    WHERE repos.full_name = ?
    ORDER BY runs.created_at DESC
    LIMIT 1
  `).get(fullName);
}

async function listBookmarks() {
  const db = await getLibraryDb();
  return db.prepare(`SELECT * FROM bookmarks ORDER BY created_at DESC`).all().map(row => ({ ...row }));
}

async function latestIdeaRun(topic = '') {
  const entries = await listRunHistory({ limit: 50, kind: 'ideas', topic });
  if (!entries.length) throw new Error('No saved idea runs available yet. Run `repo-scout ideas` first.');
  return loadRunHistory(entries[0].id);
}

function pickIdeaFromRun(run, opts = {}) {
  const index = Math.max(1, n(opts.idea, 1)) - 1;
  const idea = run.ideas?.[index];
  if (!idea) throw new Error(`Idea ${index + 1} not found in run ${run.id}.`);
  return idea;
}

function buildIdeaSpec(idea, run) {
  const lines = [
    `# Product Spec: ${idea.title}`,
    '',
    `- Source topic: ${run.topic}`,
    `- Source run: ${run.id}`,
    `- Overall score: ${idea.scores?.overall}/10`,
    `- Confidence: ${idea.scores?.confidence || 'n/a'}/10`,
    `- Difficulty: ${idea.difficulty}`,
    `- Market angle: ${idea.marketAngle}`,
    `- Use case: ${idea.useCase || 'not specified'}`,
    '',
    '## Pitch',
    idea.pitch || '',
    '',
    '## Why this combination',
    idea.why || '',
    '',
    '## Differentiation',
    idea.differentiation || '',
    '',
    '## Risks',
    idea.risk || '',
    '',
    '## Suggested MVP',
    ...(idea.mvp || []).map(step => `- ${step}`),
    '',
    '## Source repos',
    ...(idea.repos || []).map(repo => `- ${repo.name} — ${repo.url}`),
  ];
  return lines.join('\n');
}

function buildOpenClawPrompt(idea, run) {
  return [
    `Use this Repo Scout idea as the working brief: ${idea.title}.`,
    '',
    `Topic: ${run.topic}`,
    `Pitch: ${idea.pitch}`,
    `Use case: ${idea.useCase || 'n/a'}`,
    `Market angle: ${idea.marketAngle || 'n/a'}`,
    `Differentiation: ${idea.differentiation || 'n/a'}`,
    `Risk: ${idea.risk || 'n/a'}`,
    '',
    `Source repos: ${(idea.repos || []).map(repo => repo.name).join(', ')}`,
    `Capabilities: ${(idea.capabilities || []).join(', ')}`,
    '',
    'Please produce:',
    '1. a crisp product concept',
    '2. target user and top pain point',
    '3. MVP scope and non-goals',
    '4. technical architecture using the source repos',
    '5. execution plan in 2-week milestones',
    '6. biggest product and technical risks with mitigations',
  ].join('\n');
}

async function emit(opts, payload, textPrinter, markdownBuilder) {
  let output;
  if (opts.json) output = JSON.stringify(payload, null, 2);
  else if (opts.markdown) output = markdownBuilder();
  else return textPrinter();
  if (opts.out) {
    await writeFile(path.resolve(process.cwd(), opts.out), output + '\n');
    console.log(`Wrote ${opts.json ? 'JSON' : 'Markdown'} to ${opts.out}`);
  } else {
    console.log(output);
  }
}

async function collectProfiles(topic, opts = {}) {
  const repos = await searchRepos(topic, opts);
  const profiles = [];
  for (const repo of repos) {
    const readme = opts['no-readme'] ? '' : await getReadme(repo.full_name);
    profiles.push(profileRepo(repo, readme));
  }
  return profiles.sort((a, b) => (b.scores.confidence - a.scores.confidence) || (b.stars - a.stars));
}

async function cmdSearch(opts) {
  const topic = resolveTopic(opts);
  const profiles = (await collectProfiles(topic, { ...opts, 'no-readme': true }));
  const run = {
    id: buildRunId('search', topic),
    createdAt: new Date().toISOString(),
    kind: 'search',
    topic,
    command: 'search',
    opts: pickRunOpts(opts),
    profiles: profiles.map(normalizeRepoForHistory),
    ideas: [],
    output: opts.out || (opts.json ? 'json' : opts.markdown ? 'markdown' : 'stdout'),
  };
  await emit(
    opts,
    { topic, count: profiles.length, repos: profiles },
    () => {
      console.log(`\nFound ${profiles.length} repos for: "${topic}"\n`);
      printRepoList(profiles, opts);
    },
    () => [`# Repo Scout Search: ${topic}`, '', ...profiles.map((p, idx) => profileMarkdown(p, idx + 1))].join('\n')
  );
  await saveRunHistory(run);
}

async function cmdIdeas(opts) {
  const topic = resolveTopic(opts);
  const profiles = await collectProfiles(topic, opts);
  const maxIdeas = n(opts.ideas, 6);
  const generated = generateIdeas(profiles, maxIdeas, topic);
  const { ideas, llmMeta } = await maybeEnrichIdeasWithLlm(topic, profiles, generated, opts);
  if (!ideas.length) {
    console.log('No strong combinations found. Try a broader topic or lower --min-stars.');
    return;
  }
  const run = {
    id: buildRunId('ideas', topic),
    createdAt: new Date().toISOString(),
    kind: 'ideas',
    topic,
    command: 'ideas',
    opts: pickRunOpts(opts),
    profiles: profiles.map(normalizeRepoForHistory),
    ideas: ideas.map(normalizeIdeaForHistory),
    output: opts.out || (opts.json ? 'json' : opts.markdown ? 'markdown' : 'stdout'),
    llmMeta,
  };
  await emit(
    opts,
    { topic, analyzed: profiles.length, repos: profiles, ideas, llmMeta },
    () => {
      console.log(`\nRepo Scout ideas for: "${topic}"`);
      console.log(`Analyzed ${profiles.length} repos.\n`);
      printIdeaList(ideas, opts);
      if (llmMeta) console.log(`\nLLM enrichment: ${llmMeta.ok ? 'enabled' : 'skipped'} (${llmMeta.reason})`);
      console.log('\nTip: use --no-readme for faster runs, or set GITHUB_TOKEN for better API limits.');
    },
    () => ideasMarkdown(topic, profiles, ideas)
  );
  await saveRunHistory(run);
}

async function cmdReport(opts) {
  const topic = resolveTopic(opts);
  const profiles = await collectProfiles(topic, opts);
  const generated = generateIdeas(profiles, n(opts.ideas, 6), topic);
  const { ideas, llmMeta } = await maybeEnrichIdeasWithLlm(topic, profiles, generated, opts);
  if (!ideas.length) throw new Error('No strong combinations found. Try a broader topic or lower --min-stars.');
  const file = path.resolve(process.cwd(), opts.out || `repo-scout-report-${slugify(topic)}.html`);
  const previous = await latestRunFor('report', topic);
  const trending = await collectTrendingRepos({ limit: 8, topic, days: n(opts.days, 30) });
  const current = {
    id: buildRunId('report', topic),
    createdAt: new Date().toISOString(),
    kind: 'report',
    topic,
    command: 'report',
    opts: pickRunOpts(opts),
    profiles: profiles.map(normalizeRepoForHistory),
    ideas: ideas.map(normalizeIdeaForHistory),
    output: file,
    llmMeta,
  };
  const comparison = previous ? compareRuns(previous, current) : null;
  await writeFile(file, buildHtmlReport(topic, profiles, ideas, opts, comparison, trending), 'utf8');
  current.comparison = comparison;
  await saveRunHistory(current);
  console.log(`Wrote HTML report to ${file}`);
  if (llmMeta) console.log(`LLM enrichment: ${llmMeta.ok ? 'enabled' : 'skipped'} (${llmMeta.reason})`);
}

async function cmdBrief(opts) {
  const topic = resolveTopic(opts);
  const profiles = await collectProfiles(topic, opts);
  const generated = generateIdeas(profiles, n(opts.ideas, 4), topic);
  const { ideas, llmMeta } = await maybeEnrichIdeasWithLlm(topic, profiles, generated, opts);
  const trending = await collectTrendingRepos({ limit: 6, topic, days: n(opts.days, 30) });
  const brief = buildScoutBrief(topic, profiles, ideas, trending, llmMeta);
  const run = {
    id: buildRunId('brief', topic),
    createdAt: new Date().toISOString(),
    kind: 'brief',
    topic,
    command: 'brief',
    opts: pickRunOpts(opts),
    profiles: profiles.map(normalizeRepoForHistory),
    ideas: ideas.map(normalizeIdeaForHistory),
    output: opts.out || (opts.json ? 'json' : opts.markdown ? 'markdown' : 'stdout'),
    llmMeta,
  };
  await emit(
    opts,
    { topic, brief, repos: profiles, ideas, trending, llmMeta },
    () => console.log(`\n${brief}\n`),
    () => brief,
  );
  await saveRunHistory(run);
}

async function cmdTrending(opts) {
  const topic = resolveTopic(opts);
  const entries = await collectTrendingRepos({ limit: n(opts.limit, 10), topic, days: n(opts.days, 30) });
  await emit(
    opts,
    { topic, count: entries.length, repos: entries },
    () => {
      if (outputFormat(opts, 'full') === 'table') {
        console.table(entries.map((repo, idx) => ({ '#': idx + 1, repo: repo.fullName, stars: repo.stars, label: repo.trendLabel, delta: repo.lastDelta, total: repo.totalDelta, score: repo.trendScore })));
        return;
      }
      if (outputFormat(opts, 'full') === 'compact') {
        entries.forEach((repo, idx) => console.log(`${idx + 1}. ${repo.fullName} ${repo.trendLabel} Δ${repo.lastDelta >= 0 ? '+' : ''}${repo.lastDelta} score ${repo.trendScore}`));
        return;
      }
      printTrending(entries, topic);
    },
    () => trendingMarkdown(entries, topic),
  );
}

async function cmdHistory(opts) {
  const entries = await listRunHistory({
    limit: n(opts.limit, 20),
    kind: opts.kind || '',
    topic: opts.topic || '',
  });
  await emit(
    opts,
    { count: entries.length, runs: entries },
    () => {
      if (outputFormat(opts, 'full') === 'table') {
        console.table(entries.map((entry, idx) => ({ '#': idx + 1, id: entry.id, kind: entry.kind, topic: entry.topic, repos: entry.repoCount, ideas: entry.ideaCount, createdAt: entry.createdAt })));
        return;
      }
      if (outputFormat(opts, 'full') === 'compact') {
        entries.forEach((entry, idx) => console.log(`${idx + 1}. ${entry.kind} | ${entry.topic} | repos ${entry.repoCount} | ideas ${entry.ideaCount} | ${entry.createdAt}`));
        return;
      }
      printHistory(entries);
    },
    () => historyMarkdown(entries),
  );
}

async function cmdDiff(opts) {
  const args = opts._.filter(Boolean);
  let oldRun = null;
  let newRun = null;
  if (opts.latest || opts['--latest']) {
    const entries = await listRunHistory({ limit: 2, kind: opts.kind || '', topic: opts.topic || '' });
    if (entries.length < 2) throw new Error('Need at least two saved runs for --latest diff.');
    newRun = await loadRunHistory(entries[0].id);
    oldRun = await loadRunHistory(entries[1].id);
  } else {
    const [oldId, newId] = args;
    if (!oldId || !newId) throw new Error('Usage: repo-scout diff <oldRunId> <newRunId>');
    oldRun = await loadRunHistory(oldId);
    newRun = await loadRunHistory(newId);
  }
  const diff = compareRuns(oldRun, newRun);
  await emit(
    opts,
    diff,
    () => printDiff(diff),
    () => diffMarkdown(diff),
  );
}

function cmdPacks() {
  console.log('\nTopic packs:\n');
  Object.entries(TOPIC_PACKS).forEach(([name, query]) => {
    console.log(`- ${name.padEnd(10)} ${query}`);
  });
}

async function cmdLibrary(opts) {
  const mode = (opts._[0] || 'top-repos').toLowerCase();
  if (mode === 'top-repos') {
    const rows = await libraryTopRepos({ limit: n(opts.limit, 10), topic: opts.topic || '' });
    console.table(rows);
    return;
  }
  if (mode === 'ideas') {
    const rows = await libraryTopIdeas({ limit: n(opts.limit, 10), topic: opts.topic || '' });
    console.table(rows);
    return;
  }
  throw new Error('Usage: repo-scout library top-repos|ideas [--limit 10] [--topic topic]');
}

async function cmdBookmark(opts) {
  const mode = (opts._[0] || '').toLowerCase();
  if (mode === 'add') {
    const fullName = opts._[1];
    if (!fullName || !fullName.includes('/')) throw new Error('Usage: repo-scout bookmark add owner/repo [--note text]');
    await addBookmark(fullName, opts.note || '');
    console.log(`Bookmarked ${fullName}`);
    return;
  }
  if (mode === 'list') {
    console.table(await listBookmarks());
    return;
  }
  throw new Error('Usage: repo-scout bookmark add owner/repo [--note text] | bookmark list');
}

async function cmdSpec(opts) {
  const run = await latestIdeaRun(opts.topic || '');
  const idea = pickIdeaFromRun(run, opts);
  console.log(`\n${buildIdeaSpec(idea, run)}\n`);
}

async function cmdOpenClawPrompt(opts) {
  const run = await latestIdeaRun(opts.topic || '');
  const idea = pickIdeaFromRun(run, opts);
  console.log(`\n${buildOpenClawPrompt(idea, run)}\n`);
}

async function cmdConfigInit(opts) {
  const target = await writeDefaultConfig(Boolean(opts.force));
  console.log(`Wrote config template to ${target}`);
}

async function cmdExplain(opts) {
  const fullName = opts._[0];
  if (!fullName || !fullName.includes('/')) throw new Error('Usage: repo-scout explain owner/repo');
  const repo = await getRepo(fullName);
  const readme = await getReadme(fullName);
  const profile = profileRepo(repo, readme);
  await emit(
    opts,
    { repo: profile, readmeCharsAnalyzed: readme.length },
    () => {
      console.log('');
      printRepo(profile);
      console.log(`   Topics: ${profile.topics.slice(0, 12).join(', ') || 'none'}`);
      console.log(`   Keywords: ${profile.keywords.join(', ')}`);
      console.log(`   Scores: freshness ${profile.scores.freshness}/10, popularity ${profile.scores.popularity}/10, integration ${profile.scores.integration}/10`);
      console.log(`   Breakdown: docs ${profile.scores.breakdown.docsQuality}/10, maintenance ${profile.scores.breakdown.maintenance}/10, capability ${profile.scores.breakdown.capabilityConfidence}/10, maturity ${profile.scores.breakdown.repoMaturity}/10`);
      console.log(`   README chars analyzed: ${readme.length}`);
    },
    () => `${profileMarkdown(profile)}\n- **Topics:** ${profile.topics.slice(0, 12).join(', ') || 'none'}\n- **Keywords:** ${profile.keywords.join(', ')}\n- **Scores:** freshness ${profile.scores.freshness}/10, popularity ${profile.scores.popularity}/10, integration ${profile.scores.integration}/10\n- **Breakdown:** docs ${profile.scores.breakdown.docsQuality}/10, maintenance ${profile.scores.breakdown.maintenance}/10, capability ${profile.scores.breakdown.capabilityConfidence}/10, maturity ${profile.scores.breakdown.repoMaturity}/10\n- **README chars analyzed:** ${readme.length}\n`
  );
}

async function main() {
  const { cmd, opts: rawOpts } = parseArgs(process.argv.slice(2));
  try {
    const loadedConfig = await loadConfigFile(rawOpts.config || '');
    const opts = applyConfigDefaults(rawOpts, loadedConfig.data || {});
    if (loadedConfig.path && !opts.json && !opts.markdown && cmd !== 'config-init') {
      console.log(`Using config: ${loadedConfig.path}`);
    }
    if (cmd === 'help' || cmd === '--help' || cmd === '-h') return usage();
    if (cmd === 'version' || cmd === '--version') return console.log(VERSION);
    if (cmd === 'packs') return cmdPacks();
    if (cmd === 'config-init') return await cmdConfigInit(opts);
    if (cmd === 'library') return await cmdLibrary(opts);
    if (cmd === 'bookmark') return await cmdBookmark(opts);
    if (cmd === 'spec') return await cmdSpec(opts);
    if (cmd === 'openclaw-prompt') return await cmdOpenClawPrompt(opts);
    if (cmd === 'search') return await cmdSearch(opts);
    if (cmd === 'ideas') return await cmdIdeas(opts);
    if (cmd === 'report') return await cmdReport(opts);
    if (cmd === 'brief') return await cmdBrief(opts);
    if (cmd === 'trending') return await cmdTrending(opts);
    if (cmd === 'history') return await cmdHistory(opts);
    if (cmd === 'diff') return await cmdDiff(opts);
    if (cmd === 'explain') return await cmdExplain(opts);
    usage();
    process.exitCode = 1;
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    if (/rate limit/i.test(err.message)) console.error('Set GITHUB_TOKEN to increase GitHub API limits.');
    process.exitCode = 1;
  }
}

main();
