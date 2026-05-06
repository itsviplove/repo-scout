#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const VERSION = '0.1.0';
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(SCRIPT_DIR, '..');
const CACHE_DIR = path.join(PROJECT_DIR, '.repo-scout-cache');
const DEFAULT_TOPICS = 'ai agents automation developer tools';
const STOPWORDS = new Set('the a an and or of to in for with on by from is are be as at it this that into your you ai llm open source github https http com org img alt src href badge shield true false null undefined user users repo repos repository get build second first production-ready platform use using based toolkit framework'.split(' '));

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
  console.log(`repo-scout v${VERSION}\n\nUsage:\n  repo-scout search [topic] [--topic-pack pack] [--limit 10] [--min-stars 100] [--language TypeScript] [--days 365] [--sort stars|updated|fresh] [--json] [--markdown] [--out file]\n  repo-scout ideas [topic] [--topic-pack pack] [--limit 12] [--ideas 6] [--no-readme] [--json] [--markdown] [--out file]\n  repo-scout report [topic] [--topic-pack pack] [--limit 12] [--ideas 6] [--out report.html]\n  repo-scout explain owner/repo [--json] [--markdown] [--out file]\n  repo-scout packs\n\nExamples:\n  repo-scout ideas "ai agents automation"\n  repo-scout ideas --topic-pack browser --ideas 5\n  repo-scout report --topic-pack agents --out scout-report.html\n  repo-scout search "local-first knowledge" --limit 8 --min-stars 500\n  repo-scout explain browser-use/browser-use\n\nOptional env:\n  GITHUB_TOKEN   increases GitHub API rate limits\n`);
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

function detectCapabilities(repo, readme = '') {
  const hay = `${repo.name} ${repo.full_name} ${repo.description || ''} ${(repo.topics || []).join(' ')} ${readme.slice(0, 9000)}`.toLowerCase();
  const scored = CAPABILITIES.map(cap => ({
    key: cap.key,
    score: cap.terms.reduce((s, term) => s + (hay.includes(term) ? 1 : 0), 0)
  })).filter(x => x.score >= (x.key === 'browser automation' ? 1 : 1)).sort((a, b) => b.score - a.score);
  return scored.slice(0, 4).map(x => x.key);
}

function profileRepo(repo, readme = '') {
  const text = `${repo.description || ''}\n${(repo.topics || []).join(' ')}\n${readme.slice(0, 6000)}`;
  const caps = detectCapabilities(repo, readme);
  const pushedDays = repo.pushed_at ? Math.round((Date.now() - new Date(repo.pushed_at).getTime()) / 86400000) : 9999;
  const freshness = Math.max(0, 10 - Math.min(10, pushedDays / 30));
  const popularity = Math.min(10, Math.log10((repo.stargazers_count || 1) + 1) * 2);
  const integration = Math.min(10, caps.length * 2 + ((repo.topics || []).length > 4 ? 1 : 0) + (readme.length > 1000 ? 1 : 0));
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
    keywords: topKeywords(text),
    scores: { freshness: round(freshness), popularity: round(popularity), integration: round(integration) }
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
    const complement = archetype.match * 2 + capDiversity;
    const rawScore = complement * 1.3 + avgPopularity * 0.8 + avgFreshness * 0.5;
    const score = Math.min(10, round(rawScore / 3 + topicBoost(topic, archetype.title)));
    const repoNames = combo.map(p => p.fullName).join(' + ');
    const uniqueWords = topKeywords(combo.map(p => `${p.description} ${p.keywords.join(' ')}`).join(' '), 5);
    const families = capabilityFamilies(caps);

    ideas.push({
      title: customizeTitle(archetype.title, uniqueWords, caps, topic),
      repos: combo.map(p => ({ name: p.fullName, url: p.url, capability: p.capabilities[0] })),
      why: combo.map(p => `${p.fullName} brings ${p.capabilities.slice(0, 2).join(' + ')}`).join('; '),
      pitch: `A ${archetype.pitch}`,
      mvp: archetype.mvp,
      capabilities: caps,
      theme: pickThemeWords(uniqueWords, caps).join(', '),
      families,
      scores: {
        overall: score,
        novelty: Math.min(10, round(capDiversity + archetype.match + (combo.length === 3 ? 1 : 0))),
        buildability: Math.max(4, Math.min(10, round(11 - combo.length + archetype.match / 2))),
        usefulness: Math.min(10, round(archetype.match * 2 + avgPopularity / 2))
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
  console.log(`   Updated: ${profile.pushedAt ? profile.pushedAt.slice(0, 10) : 'unknown'} | Freshness: ${profile.scores.freshness}/10`);
  console.log(`   URL: ${profile.url}`);
}

function printIdea(idea, i) {
  console.log(`\n${i}. ${idea.title}  [overall ${idea.scores.overall}/10]`);
  console.log(`   Repos: ${idea.repos.map(r => r.name).join(' + ')}`);
  if (idea.theme) console.log(`   Theme: ${idea.theme}`);
  console.log(`   Pitch: ${idea.pitch}`);
  console.log(`   Why: ${idea.why}`);
  console.log(`   Scores: novelty ${idea.scores.novelty}/10, buildability ${idea.scores.buildability}/10, usefulness ${idea.scores.usefulness}/10`);
  console.log(`   MVP:`);
  for (const step of idea.mvp) console.log(`   - ${step}`);
}

function profileMarkdown(profile, i = null) {
  const head = i == null ? `## ${profile.fullName}` : `## ${i}. ${profile.fullName}`;
  return `${head}\n\n- **Stars:** ${profile.stars}\n- **Language:** ${profile.language}\n- **Updated:** ${profile.pushedAt ? profile.pushedAt.slice(0, 10) : 'unknown'}\n- **Freshness:** ${profile.scores.freshness}/10\n- **Description:** ${profile.description}\n- **Capabilities:** ${profile.capabilities.join(', ')}\n- **URL:** ${profile.url}\n`;
}

function ideasMarkdown(topic, profiles, ideas) {
  const lines = [`# Repo Scout Ideas: ${topic}`, '', `Analyzed ${profiles.length} repositories.`, ''];
  ideas.forEach((idea, idx) => {
    lines.push(`## ${idx + 1}. ${idea.title}`, '');
    lines.push(`- **Repos:** ${idea.repos.map(r => `[${r.name}](${r.url})`).join(' + ')}`);
    lines.push(`- **Score:** ${idea.scores.overall}`);
    if (idea.theme) lines.push(`- **Theme:** ${idea.theme}`);
    lines.push(`- **Scores:** novelty ${idea.scores.novelty}/10, buildability ${idea.scores.buildability}/10, usefulness ${idea.scores.usefulness}/10`);
    lines.push(`- **Pitch:** ${idea.pitch}`);
    lines.push(`- **Why:** ${idea.why}`);
    lines.push('', '**MVP:**');
    idea.mvp.forEach(step => lines.push(`- ${step}`));
    lines.push('');
  });
  return lines.join('\n');
}

function buildHtmlReport(topic, profiles, ideas, opts = {}) {
  const generatedAt = new Date().toISOString();
  const topLanguages = [...new Set(profiles.map(profile => profile.language).filter(Boolean))].slice(0, 8);
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
        <div class="stat"><div class="num">${topLanguages.length}</div><div class="muted">Languages represented</div></div>
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

    <section class="section">
      <h2>Ranked ideas</h2>
      <div class="grid ideas">
        ${ideas.map((idea, idx) => `
          <article class="panel">
            <h3>${idx + 1}. ${escapeHtml(idea.title)}</h3>
            <p class="score">Overall ${idea.scores.overall}/10</p>
            ${idea.theme ? `<p class="muted small">Theme: ${escapeHtml(idea.theme)}</p>` : ''}
            <p>${escapeHtml(idea.pitch)}</p>
            <p class="small"><strong>Repos:</strong> ${idea.repos.map(repo => `<a href="${escapeHtml(repo.url)}">${escapeHtml(repo.name)}</a>`).join(' + ')}</p>
            <p class="small"><strong>Why:</strong> ${escapeHtml(idea.why)}</p>
            <div class="repo-tags">${idea.capabilities.map(cap => `<span class="badge">${escapeHtml(cap)}</span>`).join('')}</div>
            <p class="small section"><strong>Score mix:</strong> novelty ${idea.scores.novelty}/10 · buildability ${idea.scores.buildability}/10 · usefulness ${idea.scores.usefulness}/10</p>
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
            <tr>
              <td><a class="repo-name" href="${escapeHtml(profile.url)}">${escapeHtml(profile.fullName)}</a><div class="muted small">${escapeHtml(profile.description)}</div></td>
              <td>${profile.stars}</td>
              <td>${escapeHtml(profile.language)}</td>
              <td>${escapeHtml(profile.capabilities.join(', '))}</td>
              <td>${escapeHtml(profile.pushedAt ? profile.pushedAt.slice(0, 10) : 'unknown')}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </section>
  </div>
</body>
</html>`;
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

async function cmdSearch(opts) {
  const topic = resolveTopic(opts);
  const repos = await searchRepos(topic, opts);
  const profiles = repos.map(r => profileRepo(r));
  await emit(
    opts,
    { topic, count: profiles.length, repos: profiles },
    () => {
      console.log(`\nFound ${profiles.length} repos for: "${topic}"\n`);
      profiles.forEach((p, idx) => printRepo(p, idx + 1));
    },
    () => [`# Repo Scout Search: ${topic}`, '', ...profiles.map((p, idx) => profileMarkdown(p, idx + 1))].join('\n')
  );
}

async function cmdIdeas(opts) {
  const topic = resolveTopic(opts);
  const repos = await searchRepos(topic, opts);
  const profiles = [];
  for (const repo of repos) {
    const readme = opts['no-readme'] ? '' : await getReadme(repo.full_name);
    profiles.push(profileRepo(repo, readme));
  }
  const maxIdeas = n(opts.ideas, 6);
  const ideas = generateIdeas(profiles, maxIdeas, topic);
  if (!ideas.length) {
    console.log('No strong combinations found. Try a broader topic or lower --min-stars.');
    return;
  }
  await emit(
    opts,
    { topic, analyzed: profiles.length, repos: profiles, ideas },
    () => {
      console.log(`\nRepo Scout ideas for: "${topic}"`);
      console.log(`Analyzed ${profiles.length} repos.\n`);
      ideas.forEach((idea, idx) => printIdea(idea, idx + 1));
      console.log('\nTip: use --no-readme for faster runs, or set GITHUB_TOKEN for better API limits.');
    },
    () => ideasMarkdown(topic, profiles, ideas)
  );
}

async function cmdReport(opts) {
  const topic = resolveTopic(opts);
  const repos = await searchRepos(topic, opts);
  const profiles = [];
  for (const repo of repos) {
    const readme = opts['no-readme'] ? '' : await getReadme(repo.full_name);
    profiles.push(profileRepo(repo, readme));
  }
  const ideas = generateIdeas(profiles, n(opts.ideas, 6), topic);
  if (!ideas.length) throw new Error('No strong combinations found. Try a broader topic or lower --min-stars.');
  const file = path.resolve(process.cwd(), opts.out || `repo-scout-report-${slugify(topic)}.html`);
  await writeFile(file, buildHtmlReport(topic, profiles, ideas, opts), 'utf8');
  console.log(`Wrote HTML report to ${file}`);
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'report';
}

function cmdPacks() {
  console.log('\nTopic packs:\n');
  Object.entries(TOPIC_PACKS).forEach(([name, query]) => {
    console.log(`- ${name.padEnd(10)} ${query}`);
  });
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
      console.log(`   README chars analyzed: ${readme.length}`);
    },
    () => `${profileMarkdown(profile)}\n- **Topics:** ${profile.topics.slice(0, 12).join(', ') || 'none'}\n- **Keywords:** ${profile.keywords.join(', ')}\n- **Scores:** freshness ${profile.scores.freshness}/10, popularity ${profile.scores.popularity}/10, integration ${profile.scores.integration}/10\n- **README chars analyzed:** ${readme.length}\n`
  );
}

async function main() {
  const { cmd, opts } = parseArgs(process.argv.slice(2));
  try {
    if (cmd === 'help' || cmd === '--help' || cmd === '-h') return usage();
    if (cmd === 'version' || cmd === '--version') return console.log(VERSION);
    if (cmd === 'packs') return cmdPacks();
    if (cmd === 'search') return await cmdSearch(opts);
    if (cmd === 'ideas') return await cmdIdeas(opts);
    if (cmd === 'report') return await cmdReport(opts);
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
