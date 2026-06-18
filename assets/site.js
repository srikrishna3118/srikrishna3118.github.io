(() => {
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  const applyTheme = (theme, persist) => {
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }

    if (persist) {
      try {
        localStorage.setItem('theme', theme);
      } catch {
        // ignore
      }
    }

    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    const icon = toggle.querySelector('[data-icon]');
    const label = toggle.querySelector('[data-label]');
    toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');

    if (icon) {
      icon.className = theme === 'dark' ? 'fa fa-sun-o' : 'fa fa-moon-o';
    }
    if (label) {
      label.textContent = theme === 'dark' ? 'Light' : 'Dark';
    }
  };

  const initTheme = () => {
    let stored = null;
    try {
      stored = localStorage.getItem('theme');
    } catch {
      stored = null;
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
    const initial = stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light');
    applyTheme(initial, false);

    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
      });
    }
  };

  const initSmoothAnchors = () => {
    document.addEventListener('click', (event) => {
      const link = event.target?.closest?.('a[href^="#"]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();

      if (prefersReducedMotion) {
        target.scrollIntoView();
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      try {
        history.replaceState(null, '', href);
      } catch {
        // ignore
      }
    });
  };

  const initScrollSpy = () => {
    const navLinks = Array.from(document.querySelectorAll('.topnav-link[href^="#"]'));
    const sections = navLinks
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    if (!('IntersectionObserver' in window)) return;
    if (sections.length === 0) return;

    const setActive = (sectionId) => {
      navLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === sectionId);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));

        if (visible.length === 0) return;
        setActive(`#${visible[0].target.id}`);
      },
      {
        rootMargin: '-30% 0px -60% 0px',
        threshold: [0.1, 0.2, 0.35],
      }
    );

    sections.forEach((section) => observer.observe(section));
  };

  const initReveal = () => {
    const revealTargets = Array.from(document.querySelectorAll('[data-reveal]'));
    if (revealTargets.length === 0) return;

    revealTargets.forEach((el) => el.classList.add('reveal'));

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealTargets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const isAlreadyVisible = (el) => {
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed') return true;

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      return rect.bottom > 0 && rect.top < vh;
    };

    // Avoid "stuck hidden" on refresh for above-the-fold content.
    const pending = revealTargets.filter((el) => {
      if (!isAlreadyVisible(el)) return true;
      el.classList.add('is-visible');
      return false;
    });

    if (pending.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 }
    );

    pending.forEach((el) => observer.observe(el));
  };

  const copyText = async (value) => {
    if (!value) return false;

    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // fallback
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const initCopyButtons = () => {
    const btn = document.querySelector('[data-copy]');
    if (!btn) return;

    const original = btn.textContent;

    btn.addEventListener('click', async () => {
      const value = btn.getAttribute('data-copy');
      const ok = await copyText(value);
      btn.textContent = ok ? 'Copied' : 'Copy failed';
      btn.disabled = true;

      window.setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 1200);
    });
  };

  const initBackToTop = () => {
    const btn = document.getElementById('backToTop');
    if (!btn) return;

    const onScroll = () => {
      btn.classList.toggle('is-visible', window.scrollY > 650);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', () => {
      if (prefersReducedMotion) {
        window.scrollTo(0, 0);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  const initTimeline = () => {
    // Static chronological rows — no interactive timeline behavior needed.
  };

  const GITHUB_USER = 'srikrishna3118';
  const FEATURED_REPOS = [
    'CORNET',
    'py_cornet',
    'modern-systems-engineering',
    'inverted_pendulum_control',
    'nvidia_auvidea_j120support',
    'droneacharya.net',
  ];
  const CACHE_TTL_MS = 60 * 60 * 1000;
  const CACHE_PREFIX = 'gh-cache:';

  const LANG_COLORS = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    Java: '#b07219',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    PHP: '#4F5D95',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    Shell: '#89e051',
    HTML: '#e34c26',
    CSS: '#563d7c',
    'Jupyter Notebook': '#DA5B0B',
  };

  const readCache = (key) => {
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const writeCache = (key, data) => {
    try {
      localStorage.setItem(
        `${CACHE_PREFIX}${key}`,
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch {
      // ignore quota errors
    }
  };

  const isCacheFresh = (entry) => {
    if (!entry?.timestamp) return false;
    return Date.now() - entry.timestamp < CACHE_TTL_MS;
  };

  const githubFetch = async (url, cacheKey, accept) => {
    const cached = readCache(cacheKey);
    if (cached && isCacheFresh(cached)) {
      return { data: cached.data, fromCache: true, stale: false };
    }

    const headers = { Accept: accept || 'application/vnd.github+json' };
    try {
      const response = await fetch(url, { headers });
      if (response.status === 403) {
        if (cached) return { data: cached.data, fromCache: true, stale: true, rateLimited: true };
        throw new Error('rate_limited');
      }
      if (!response.ok) {
        if (cached) return { data: cached.data, fromCache: true, stale: true };
        throw new Error(`http_${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : await response.text();
      writeCache(cacheKey, data);
      return { data, fromCache: false, stale: false };
    } catch (error) {
      if (cached) return { data: cached.data, fromCache: true, stale: true };
      throw error;
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  const getLangColor = (lang) => LANG_COLORS[lang] || '#8b949e';

  const animateCount = (el, target) => {
    if (!el) return;
    const end = Number.parseInt(String(target), 10);
    if (!Number.isFinite(end)) {
      el.textContent = String(target);
      return;
    }

    if (prefersReducedMotion) {
      el.textContent = String(end);
      return;
    }

    const duration = 900;
    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const value = Math.round(from + (end - from) * eased);
      el.textContent = String(value);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  const initImpactStats = () => {
    const stats = Array.from(document.querySelectorAll('.stat-value[data-count]'));
    if (stats.length === 0) return;

    const run = () => {
      stats.forEach((el) => {
        const target = el.getAttribute('data-count') ?? '0';
        if (el.getAttribute('data-stat') === 'github-stars') return;
        animateCount(el, target);
      });
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            run();
            observer.disconnect();
          });
        },
        { threshold: 0.35 }
      );
      const hero = document.getElementById('hero');
      if (hero) observer.observe(hero);
      else run();
    } else {
      run();
    }
  };

  const initResearchFilters = () => {
    const chips = Array.from(document.querySelectorAll('[data-research-filter]'));
    const papers = Array.from(document.querySelectorAll('.paper[data-research]'));
    if (chips.length === 0 || papers.length === 0) return;

    const applyFilter = (filter) => {
      chips.forEach((chip) => {
        chip.classList.toggle('is-active', chip.getAttribute('data-research-filter') === filter);
      });

      papers.forEach((paper) => {
        const tags = (paper.getAttribute('data-research') || '').split(/\s+/);
        const visible = filter === 'all' || tags.includes(filter);
        paper.classList.toggle('is-filtered-out', !visible);
      });
    };

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        applyFilter(chip.getAttribute('data-research-filter') || 'all');
      });
    });
  };

  const initProjects = () => {
    const featuredEl = document.getElementById('featuredProjects');
    const moreEl = document.getElementById('moreProjects');
    const statusEl = document.getElementById('projectsStatus');
    const searchEl = document.getElementById('projectSearch');
    const langFiltersEl = document.getElementById('languageFilters');
    const sortButtons = Array.from(document.querySelectorAll('.sort-btn[data-sort]'));
    const modal = document.getElementById('projectModal');

    if (!featuredEl || !moreEl) return;

    let allRepos = [];
    let filteredRepos = [];
    let activeLanguage = 'all';
    let activeSort = 'stars';
    let rateLimited = false;

    const setStatus = (message, isError = false) => {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.classList.toggle('projects-error', isError);
    };

    const updateHeroStars = (totalStars) => {
      const heroStat = document.querySelector('.stat-value[data-stat="github-stars"]');
      if (!heroStat) return;
      heroStat.setAttribute('data-count', String(totalStars));
      animateCount(heroStat, totalStars);
    };

    const updateGithubStats = (repos, user) => {
      const totalStars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
      const reposEl = document.querySelector('[data-stat-repos]');
      const starsEl = document.querySelector('[data-stat-stars]');
      const followersEl = document.querySelector('[data-stat-followers]');

      if (reposEl) reposEl.textContent = String(user?.public_repos ?? repos.length);
      if (starsEl) starsEl.textContent = String(totalStars);
      if (followersEl) followersEl.textContent = String(user?.followers ?? '—');

      updateHeroStars(totalStars);
    };

    const getLanguages = (repos) => {
      const langs = new Set();
      repos.forEach((repo) => {
        if (repo.language) langs.add(repo.language);
      });
      return Array.from(langs).sort((a, b) => a.localeCompare(b));
    };

    const renderLanguageFilters = (repos) => {
      if (!langFiltersEl) return;
      const langs = getLanguages(repos);
      langFiltersEl.innerHTML = '';

      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = `lang-chip${activeLanguage === 'all' ? ' is-active' : ''}`;
      allBtn.textContent = 'All languages';
      allBtn.addEventListener('click', () => {
        activeLanguage = 'all';
        renderLanguageFilters(allRepos);
        applyFilters();
      });
      langFiltersEl.appendChild(allBtn);

      langs.forEach((lang) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `lang-chip${activeLanguage === lang ? ' is-active' : ''}`;
        btn.innerHTML = `<span class="lang-dot" style="background:${getLangColor(lang)}"></span>${lang}`;
        btn.addEventListener('click', () => {
          activeLanguage = lang;
          renderLanguageFilters(allRepos);
          applyFilters();
        });
        langFiltersEl.appendChild(btn);
      });
    };

    const sortRepos = (repos) => {
      const sorted = [...repos];
      if (activeSort === 'updated') {
        sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      } else {
        sorted.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
      }
      return sorted;
    };

    const escapeHtml = (value) => {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const createProjectCard = (repo) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'project-card';
      card.setAttribute('data-repo', repo.name);

      const lang = repo.language || 'Unknown';
      const topics = (repo.topics || []).slice(0, 4);
      const topicHtml = topics.length
        ? `<div class="project-topics">${topics.map((t) => `<span class="project-topic">${escapeHtml(t)}</span>`).join('')}</div>`
        : '';

      card.innerHTML = `
        <div class="project-card-header">
          <h4 class="project-card-name">${escapeHtml(repo.name)}</h4>
          <span class="project-card-meta"><i class="fa fa-star" aria-hidden="true"></i> ${repo.stargazers_count || 0}</span>
        </div>
        <p class="project-card-desc">${escapeHtml(repo.description || 'No description provided.')}</p>
        <div class="project-card-meta">
          <span><span class="lang-dot" style="background:${getLangColor(lang)}"></span>${escapeHtml(lang)}</span>
          <span><i class="fa fa-code-fork" aria-hidden="true"></i> ${repo.forks_count || 0}</span>
          <span>Updated ${formatDate(repo.updated_at)}</span>
        </div>
        ${topicHtml}
      `;

      card.addEventListener('click', () => openProjectModal(repo.name));
      return card;
    };

    const renderGrid = (container, repos, emptyMessage) => {
      container.innerHTML = '';
      if (repos.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'projects-empty';
        empty.textContent = emptyMessage;
        container.appendChild(empty);
        return;
      }
      repos.forEach((repo) => container.appendChild(createProjectCard(repo)));
    };

    const renderProjects = () => {
      const featuredSet = new Set(FEATURED_REPOS);
      const sorted = sortRepos(filteredRepos);
      const featured = FEATURED_REPOS
        .map((name) => sorted.find((repo) => repo.name === name))
        .filter(Boolean);
      const more = sorted.filter((repo) => !featuredSet.has(repo.name));

      renderGrid(featuredEl, featured, 'No featured projects match your filters.');
      renderGrid(moreEl, more, 'No additional projects match your filters.');
    };

    const applyFilters = () => {
      const query = (searchEl?.value || '').trim().toLowerCase();
      filteredRepos = allRepos.filter((repo) => {
        const haystack = [
          repo.name,
          repo.description || '',
          ...(repo.topics || []),
          repo.language || '',
        ]
          .join(' ')
          .toLowerCase();

        const matchesQuery = !query || haystack.includes(query);
        const matchesLang = activeLanguage === 'all' || repo.language === activeLanguage;
        return matchesQuery && matchesLang;
      });

      renderProjects();
      setStatus(
        rateLimited
          ? 'Showing cached GitHub data (API rate limit reached). Data may be slightly stale.'
          : filteredRepos.length
            ? `${filteredRepos.length} project${filteredRepos.length === 1 ? '' : 's'} shown`
            : 'No projects match your search.'
      );
    };

    const closeModal = () => {
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    const openProjectModal = async (repoName) => {
      if (!modal) return;
      const repo = allRepos.find((r) => r.name === repoName);
      if (!repo) return;

      const titleEl = document.getElementById('projectModalTitle');
      const descEl = document.getElementById('projectModalDesc');
      const metaEl = document.getElementById('projectModalMeta');
      const langEl = document.getElementById('projectModalLang');
      const actionsEl = document.getElementById('projectModalActions');
      const readmeEl = document.getElementById('projectModalReadme');

      if (titleEl) titleEl.textContent = repo.full_name || repo.name;
      if (descEl) descEl.textContent = repo.description || 'No description provided.';
      if (metaEl) {
        metaEl.innerHTML = `
          <span><i class="fa fa-star" aria-hidden="true"></i> ${repo.stargazers_count || 0} stars</span>
          <span><i class="fa fa-code-fork" aria-hidden="true"></i> ${repo.forks_count || 0} forks</span>
          <span>Updated ${formatDate(repo.updated_at)}</span>
          ${repo.license?.spdx_id ? `<span>License: ${escapeHtml(repo.license.spdx_id)}</span>` : ''}
        `;
      }
      if (langEl) langEl.innerHTML = '';
      if (actionsEl) {
        actionsEl.innerHTML = `
          <a class="pill-btn" href="${repo.html_url}" target="_blank" rel="noopener"><i class="fa fa-github" aria-hidden="true"></i> Repository</a>
          ${repo.homepage ? `<a class="pill-btn" href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener"><i class="fa fa-external-link" aria-hidden="true"></i> Homepage</a>` : ''}
          <a class="pill-btn" href="${repo.html_url}/issues" target="_blank" rel="noopener"><i class="fa fa-bug" aria-hidden="true"></i> Issues</a>
        `;
      }
      if (readmeEl) readmeEl.innerHTML = '<p class="projects-loading">Loading README...</p>';

      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      try {
        const detailKey = `${GITHUB_USER}:${repo.name}:detail`;
        const langsKey = `${GITHUB_USER}:${repo.name}:langs`;
        const readmeKey = `${GITHUB_USER}:${repo.name}:readme`;

        const [detailResult, langsResult, readmeResult] = await Promise.all([
          githubFetch(`https://api.github.com/repos/${GITHUB_USER}/${repo.name}`, detailKey),
          githubFetch(`https://api.github.com/repos/${GITHUB_USER}/${repo.name}/languages`, langsKey),
          githubFetch(
            `https://api.github.com/repos/${GITHUB_USER}/${repo.name}/readme`,
            readmeKey,
            'application/vnd.github.raw'
          ),
        ]);

        const detail = detailResult.data || repo;
        const langs = langsResult.data || {};
        const totalBytes = Object.values(langs).reduce((sum, n) => sum + n, 0);

        if (titleEl) titleEl.textContent = detail.full_name || repo.name;
        if (descEl) descEl.textContent = detail.description || 'No description provided.';

        if (langEl && totalBytes > 0) {
          const segments = Object.entries(langs)
            .sort((a, b) => b[1] - a[1])
            .map(([name, bytes]) => {
              const pct = ((bytes / totalBytes) * 100).toFixed(1);
              return `<span class="lang-bar-segment" style="width:${pct}%;background:${getLangColor(name)}" title="${escapeHtml(name)} ${pct}%"></span>`;
            })
            .join('');

          const legend = Object.entries(langs)
            .sort((a, b) => b[1] - a[1])
            .map(([name, bytes]) => {
              const pct = ((bytes / totalBytes) * 100).toFixed(1);
              return `<span><span class="lang-dot" style="background:${getLangColor(name)}"></span>${escapeHtml(name)} ${pct}%</span>`;
            })
            .join('');

          langEl.innerHTML = `<div class="lang-bar">${segments}</div><div class="lang-legend">${legend}</div>`;
        } else if (langEl) {
          langEl.innerHTML = '<p class="projects-empty">Language breakdown unavailable.</p>';
        }

        if (readmeEl) {
          const raw = typeof readmeResult.data === 'string' ? readmeResult.data : '';
          if (raw && window.marked && window.DOMPurify) {
            const html = window.marked.parse(raw, { gfm: true, breaks: true });
            readmeEl.innerHTML = window.DOMPurify.sanitize(html);
          } else if (raw) {
            readmeEl.textContent = raw;
          } else {
            readmeEl.innerHTML = `<p class="projects-empty">README unavailable. <a href="${repo.html_url}" target="_blank" rel="noopener">View on GitHub</a></p>`;
          }
        }
      } catch {
        if (readmeEl) {
          readmeEl.innerHTML = `<p class="projects-error">Could not load project details. <a href="${repo.html_url}" target="_blank" rel="noopener">View on GitHub</a></p>`;
        }
      }
    };

    const loadProjects = async () => {
      setStatus('Loading projects from GitHub...');
      featuredEl.innerHTML = '<p class="projects-loading">Loading featured projects...</p>';
      moreEl.innerHTML = '';

      try {
        const [reposResult, userResult] = await Promise.all([
          githubFetch(
            `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`,
            `${GITHUB_USER}:repos`
          ),
          githubFetch(`https://api.github.com/users/${GITHUB_USER}`, `${GITHUB_USER}:user`),
        ]);

        rateLimited = Boolean(reposResult.rateLimited || userResult.rateLimited);
        const repos = Array.isArray(reposResult.data) ? reposResult.data : [];
        allRepos = repos.filter((repo) => !repo.fork && repo.name !== `${GITHUB_USER}.github.io`);
        filteredRepos = allRepos;

        updateGithubStats(allRepos, userResult.data);
        renderLanguageFilters(allRepos);
        applyFilters();
      } catch {
        setStatus('Unable to load GitHub projects. Visit the profile on GitHub instead.', true);
        featuredEl.innerHTML = '<p class="projects-error">Could not load projects.</p>';
        moreEl.innerHTML = `<p class="projects-empty"><a href="https://github.com/${GITHUB_USER}" target="_blank" rel="noopener">View ${GITHUB_USER} on GitHub</a></p>`;
      }
    };

    searchEl?.addEventListener('input', applyFilters);

    sortButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeSort = btn.getAttribute('data-sort') || 'stars';
        sortButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
        applyFilters();
      });
    });

    modal?.querySelectorAll('[data-modal-close]').forEach((el) => {
      el.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
    });

    loadProjects();
  };

  const init = () => {
    root.classList.add('js');
    initTheme();
    initSmoothAnchors();
    initScrollSpy();
    initReveal();
    initCopyButtons();
    initBackToTop();
    initTimeline();
    initImpactStats();
    initResearchFilters();
    initProjects();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
