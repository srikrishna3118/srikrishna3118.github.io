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
    const timeline = document.getElementById('timeline');
    if (!timeline) return;

    const buttons = Array.from(timeline.querySelectorAll('.timeline-btn'));
    if (buttons.length === 0) return;

    const detailTitle = document.querySelector('[data-timeline-detail-title]');
    const detailYears = document.querySelector('[data-timeline-detail-years]');
    const detailDesc = document.querySelector('[data-timeline-detail-desc]');

    const getStoredIndex = () => {
      try {
        const raw = localStorage.getItem('timelineActiveIndex');
        const idx = Number.parseInt(raw ?? '', 10);
        return Number.isFinite(idx) ? idx : null;
      } catch {
        return null;
      }
    };

    const storeIndex = (idx) => {
      try {
        localStorage.setItem('timelineActiveIndex', String(idx));
      } catch {
        // ignore
      }
    };

    const setActive = (idx, focus) => {
      const clamped = Math.max(0, Math.min(buttons.length - 1, idx));

      buttons.forEach((btn, i) => {
        const item = btn.closest('.timeline-item');
        const isActive = i === clamped;

        if (item) item.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.tabIndex = isActive ? 0 : -1;
      });

      const activeBtn = buttons[clamped];
      const title = activeBtn.getAttribute('data-title') ?? activeBtn.textContent?.trim() ?? '';
      const years = activeBtn.getAttribute('data-years') ?? '';
      const desc = activeBtn.getAttribute('data-desc') ?? '';

      if (detailTitle) detailTitle.textContent = title;
      if (detailYears) detailYears.textContent = years;
      if (detailDesc) detailDesc.textContent = desc;

      storeIndex(clamped);
      if (focus) activeBtn.focus({ preventScroll: true });
    };

    const initialFromMarkup = () => {
      const idx = buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true');
      return idx >= 0 ? idx : 0;
    };

    const stored = getStoredIndex();
    const initial = stored !== null ? stored : initialFromMarkup();
    setActive(initial, false);

    buttons.forEach((btn, idx) => {
      btn.addEventListener('click', () => setActive(idx, false));
    });

    timeline.addEventListener('keydown', (e) => {
      const current = buttons.findIndex((b) => b.getAttribute('aria-selected') === 'true');
      const active = current >= 0 ? current : 0;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setActive(active + 1, true);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setActive(active - 1, true);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActive(0, true);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActive(buttons.length - 1, true);
      }
    });
  };

  const init = () => {
    initTheme();
    initSmoothAnchors();
    initScrollSpy();
    initReveal();
    initCopyButtons();
    initBackToTop();
    initTimeline();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
