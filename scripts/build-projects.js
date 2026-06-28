#!/usr/bin/env node
/**
 * Generates assets/projects.json so the live site never has to hit the GitHub
 * API from the browser (unauthenticated visitors share a 60 req/hour budget and
 * would routinely see "rate limit reached").
 *
 * Run in CI with a GITHUB_TOKEN (5000 req/hour). The output bakes in:
 *   - aggregate stats (repos contributed to, total stars, followers)
 *   - per-showcase-repo metadata, language breakdown, and rendered-ready README
 *
 * The browser falls back to the live API if this file is missing, so the site
 * keeps working before the first Action run.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const GITHUB_USER = 'srikrishna3118';

const GITHUB_SOURCES = [
  { login: 'srikrishna3118', type: 'user', label: 'Personal' },
  { login: 'rbccps-iisc', type: 'org', label: 'RBCCPS' },
  { login: 'dream-lab', type: 'org', label: 'DREAM:Lab' },
  { login: 'artparkindia', type: 'org', label: 'ARTPARK' },
];

const SHOWCASE_REPOS = [
  'rbccps-iisc/CORNET2.0',
  'rbccps-iisc/CORNET',
  'srikrishna3118/modern-systems-engineering',
  'rbccps-iisc/5g_opt_drl',
  'srikrishna3118/nvidia_auvidea_j120support',
  'rbccps-iisc/AutonomousDrones',
  'srikrishna3118/ChoiRbot',
  'rbccps-iisc/DronePort_Controller',
  'rbccps-iisc/video-metadata',
];

const API = 'https://api.github.com';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

const baseHeaders = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'srikrishna3118-site-build',
  'X-GitHub-Api-Version': '2022-11-28',
};
if (token) baseHeaders.Authorization = `Bearer ${token}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ghFetch(url, accept) {
  const headers = { ...baseHeaders };
  if (accept) headers.Accept = accept;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(url, { headers });

    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get('x-ratelimit-reset'));
      const remaining = Number(res.headers.get('x-ratelimit-remaining'));
      if (remaining === 0 && reset) {
        const waitMs = Math.max(0, reset * 1000 - Date.now()) + 1000;
        console.warn(`Rate limited, waiting ${Math.round(waitMs / 1000)}s...`);
        await sleep(Math.min(waitMs, 65000));
        continue;
      }
      await sleep(2000 * (attempt + 1));
      continue;
    }

    if (res.status === 404) return { ok: false, status: 404, data: null };
    if (!res.ok) {
      await sleep(1000 * (attempt + 1));
      continue;
    }

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    return { ok: true, status: res.status, data };
  }

  return { ok: false, status: 0, data: null };
}

function isPortfolioRepo(repo, sourceLogin) {
  if (repo.fork) return false;
  if (repo.name.endsWith('.github.io')) return false;
  if (repo.name === `${sourceLogin}.github.io`) return false;
  return true;
}

async function listRepos(source) {
  const repos = [];
  for (let page = 1; page <= 5; page += 1) {
    const url = source.type === 'org'
      ? `${API}/orgs/${source.login}/repos?per_page=100&sort=updated&type=public&page=${page}`
      : `${API}/users/${source.login}/repos?per_page=100&sort=updated&page=${page}`;
    const { ok, data } = await ghFetch(url);
    if (!ok || !Array.isArray(data) || data.length === 0) break;
    repos.push(...data);
    if (data.length < 100) break;
  }
  return repos;
}

async function contributedOrgRepos(orgLogin) {
  const repos = new Set();
  for (let page = 1; page <= 10; page += 1) {
    const q = encodeURIComponent(`author:${GITHUB_USER} org:${orgLogin}`);
    const { ok, data } = await ghFetch(
      `${API}/search/commits?q=${q}&per_page=100&page=${page}`,
      'application/vnd.github.cloak-preview+json'
    );
    const items = ok && data ? data.items : null;
    if (!Array.isArray(items) || items.length === 0) break;
    items.forEach((item) => {
      const full = item.repository && item.repository.full_name;
      if (full && !full.endsWith('.github.io')) repos.add(full);
    });
    if (items.length < 100) break;
    // search has a tighter secondary limit — be gentle
    await sleep(1500);
  }
  return repos;
}

async function computeStats() {
  const merged = new Map();
  let followers = 0;

  for (const source of GITHUB_SOURCES) {
    const repos = await listRepos(source);
    let contributed = null;
    if (source.type === 'org') {
      contributed = await contributedOrgRepos(source.login);
    }
    repos.forEach((repo) => {
      if (!isPortfolioRepo(repo, source.login)) return;
      if (source.type === 'org' && !(contributed && contributed.has(repo.full_name))) return;
      merged.set(repo.full_name, repo);
    });
  }

  const userRes = await ghFetch(`${API}/users/${GITHUB_USER}`);
  if (userRes.ok && userRes.data) followers = userRes.data.followers || 0;

  const repoList = Array.from(merged.values());
  const stars = repoList.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);

  return { repos: repoList.length, stars, followers };
}

async function buildShowcase() {
  const projects = [];

  for (const fullName of SHOWCASE_REPOS) {
    const [meta, langs, readme] = await Promise.all([
      ghFetch(`${API}/repos/${fullName}`),
      ghFetch(`${API}/repos/${fullName}/languages`),
      ghFetch(`${API}/repos/${fullName}/readme`, 'application/vnd.github.raw'),
    ]);

    if (!meta.ok || !meta.data || !meta.data.full_name) {
      console.warn(`Skipping ${fullName} (meta unavailable)`);
      continue;
    }

    const d = meta.data;
    projects.push({
      full_name: d.full_name,
      name: d.name,
      html_url: d.html_url,
      homepage: d.homepage || '',
      description: d.description || '',
      stargazers_count: d.stargazers_count || 0,
      forks_count: d.forks_count || 0,
      updated_at: d.updated_at || '',
      license_spdx: (d.license && d.license.spdx_id) || '',
      languages: langs.ok && langs.data && typeof langs.data === 'object' ? langs.data : {},
      readme: readme.ok && typeof readme.data === 'string' ? readme.data : '',
    });
  }

  return projects;
}

async function main() {
  if (!token) {
    console.warn('No GITHUB_TOKEN set — running unauthenticated (may hit rate limits).');
  }

  const stats = await computeStats();
  const projects = await buildShowcase();

  const output = {
    generated_at: new Date().toISOString(),
    stats,
    projects,
  };

  const outPath = path.join(__dirname, '..', 'assets', 'projects.json');
  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${outPath}`);
  console.log(`  stats: ${JSON.stringify(stats)}`);
  console.log(`  projects: ${projects.length}/${SHOWCASE_REPOS.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
