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

  let toastTimer = null;
  const showToast = (message) => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 1800);
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
      showToast(ok ? `Copied ${value}` : 'Copy failed');

      window.setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 1200);
    });
  };

  const initScrollProgress = () => {
    const bar = document.getElementById('scrollProgress');
    if (!bar) return;

    let ticking = false;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const progress = max > 0 ? doc.scrollTop / max : 0;
      bar.style.transform = `scaleX(${progress})`;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  };

  const initStaggerReveal = () => {
    const lists = [
      document.querySelectorAll('.exp-row'),
      document.querySelectorAll('.cert-card'),
    ];
    document.querySelectorAll('.entry-list').forEach((list) => {
      lists.push(list.querySelectorAll('.paper'));
    });

    lists.forEach((items) => {
      items.forEach((el, index) => {
        el.style.setProperty('--reveal-delay', `${Math.min(index, 6) * 60}ms`);
      });
    });
  };

  const initTimelineProgress = () => {
    const timeline = document.getElementById('timeline');
    const fill = document.getElementById('timelineFill');
    if (!timeline || !fill) return;

    let ticking = false;
    const update = () => {
      const rect = timeline.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const total = rect.height || 1;
      const progress = Math.max(0, Math.min(1, (vh * 0.5 - rect.top) / total));
      fill.style.height = `${progress * 100}%`;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  };

  const initCardSpotlight = () => {
    const selector = '.stat-card, .cert-card, .project-showcase-card, .award-card, .achievement-item a';

    document.addEventListener('pointermove', (event) => {
      const card = event.target?.closest?.(selector);
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      card.style.setProperty('--mx', `${mx}px`);
      card.style.setProperty('--my', `${my}px`);

      if (!prefersReducedMotion && card.classList.contains('project-showcase-card')) {
        const px = mx / rect.width - 0.5;
        const py = my / rect.height - 0.5;
        card.style.setProperty('--rx', `${(px * 6).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${(-py * 6).toFixed(2)}deg`);
      }
    }, { passive: true });

    // Reset tilt when leaving a card (bound lazily, works for dynamic cards).
    document.addEventListener('mouseover', (event) => {
      const card = event.target?.closest?.('.project-showcase-card');
      if (!card || card.__spotBound) return;
      card.__spotBound = true;
      card.addEventListener('mouseleave', () => {
        card.style.removeProperty('--rx');
        card.style.removeProperty('--ry');
      });
    });
  };

  const initHeroNetwork = () => {
    const canvas = document.getElementById('heroCanvas');
    const hero = canvas?.closest('.hero');
    const ctx = canvas?.getContext?.('2d');
    if (!canvas || !hero || !ctx) return;

    const readAccent = () =>
      getComputedStyle(root).getPropertyValue('--accent').trim() || '#000077';

    let width = 0;
    let height = 0;
    let nodes = [];
    let emitters = new Set();
    let pulses = [];
    let frame = 0;
    let color = readAccent();
    let raf = null;
    let running = false;
    const mouse = { x: -9999, y: -9999 };
    const RING_MAX = 52;

    // Weighted device population for the IoT / wireless / robotics scene.
    const TYPES = [
      'drone', 'sensor', 'phone', 'tower', 'arm', 'sensor', 'basestation',
      'drone', 'robot', 'phone', 'satellite', 'arm', 'tower', 'robot', 'drone',
    ];

    const COVERAGE = 178;

    // A data packet that rides whichever base-station link its device holds.
    const makePulse = () => {
      const devices = [];
      nodes.forEach((n, i) => {
        if (!emitters.has(i)) devices.push(i);
      });
      const dev = devices.length ? devices[Math.floor(Math.random() * devices.length)] : 0;
      return { dev, t: Math.random(), speed: 0.012 + Math.random() * 0.012, up: Math.random() < 0.5 };
    };

    const buildNodes = () => {
      const target = Math.round((width * height) / 24000);
      const count = Math.max(10, Math.min(34, target));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.32,
        vy: (Math.random() - 0.5) * 0.32,
        type: TYPES[Math.floor(Math.random() * TYPES.length)],
        scale: 0.85 + Math.random() * 0.4,
        linkTarget: -1,
        linkStrength: 0,
        attached: false,
        nextToggle: 0,
      }));

      // Towers, base stations and satellites are the wireless emitters.
      const emitterTypes = new Set(['tower', 'basestation', 'satellite']);
      emitters = new Set();
      nodes.forEach((n, i) => {
        if (emitterTypes.has(n.type) && emitters.size < 6) emitters.add(i);
      });
      if (emitters.size === 0 && count) emitters.add(0);

      // Base stations are fixed infrastructure — they don't drift.
      emitters.forEach((i) => {
        nodes[i].vx = 0;
        nodes[i].vy = 0;
      });

      const pulseCount = Math.max(3, Math.min(10, Math.round(count / 4)));
      pulses = Array.from({ length: pulseCount }, makePulse);
    };

    // Mini device icons drawn at the canvas origin (caller translates/scales).
    const GLYPHS = {
      drone() {
        const s = 7;
        ctx.beginPath();
        ctx.moveTo(-s, -s); ctx.lineTo(s, s);
        ctx.moveTo(s, -s); ctx.lineTo(-s, s);
        ctx.stroke();
        const spin = frame * 0.25;
        [[-s, -s], [s, -s], [s, s], [-s, s]].forEach(([x, y], k) => {
          ctx.beginPath();
          ctx.ellipse(x, y, 3.4, 1.3, spin + k, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.fillRect(-2.4, -2.4, 4.8, 4.8);
      },
      tower() {
        ctx.beginPath();
        ctx.moveTo(-5, 9); ctx.lineTo(0, -7); ctx.lineTo(5, 9);
        ctx.moveTo(0, 9); ctx.lineTo(0, -7);
        ctx.moveTo(-3.2, 3); ctx.lineTo(3.2, 3);
        ctx.moveTo(-2, -1); ctx.lineTo(2, -1);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -7, 1.4, 0, Math.PI * 2);
        ctx.fill();
      },
      sensor() {
        ctx.strokeRect(-5, -5, 10, 10);
        ctx.beginPath();
        [-3, 0, 3].forEach((o) => {
          ctx.moveTo(-5, o); ctx.lineTo(-8, o);
          ctx.moveTo(5, o); ctx.lineTo(8, o);
          ctx.moveTo(o, -5); ctx.lineTo(o, -8);
          ctx.moveTo(o, 5); ctx.lineTo(o, 8);
        });
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
        ctx.fill();
      },
      robot() {
        ctx.strokeRect(-5, -4, 10, 9);
        ctx.beginPath();
        ctx.moveTo(0, -4); ctx.lineTo(0, -8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -8.6, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-2, 0, 1, 0, Math.PI * 2);
        ctx.arc(2, 0, 1, 0, Math.PI * 2);
        ctx.fill();
      },
      satellite() {
        ctx.strokeRect(-2.6, -3, 5.2, 6);
        ctx.strokeRect(-9, -2, 5, 4);
        ctx.strokeRect(4, -2, 5, 4);
        ctx.beginPath();
        ctx.moveTo(-2.6, 0); ctx.lineTo(-4, 0);
        ctx.moveTo(2.6, 0); ctx.lineTo(4, 0);
        ctx.stroke();
      },
      phone() {
        ctx.strokeRect(-3.5, -7, 7, 14);
        ctx.beginPath();
        ctx.moveTo(-1.8, -5); ctx.lineTo(1.8, -5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 5, 1, 0, Math.PI * 2);
        ctx.fill();
      },
      basestation() {
        // Mast + tri-sector antenna panels + equipment cabinet.
        ctx.beginPath();
        ctx.moveTo(0, 10); ctx.lineTo(0, -9);
        ctx.moveTo(0, -6); ctx.lineTo(-6, -8);
        ctx.moveTo(0, -6); ctx.lineTo(6, -8);
        ctx.stroke();
        ctx.fillRect(-8, -9.5, 3, 2.6);
        ctx.fillRect(5, -9.5, 3, 2.6);
        ctx.fillRect(-1.3, -12, 2.6, 3);
        ctx.strokeRect(-3, 5, 6, 5);
      },
      arm() {
        // Pick-and-place robotic arm: base, two links, gripper.
        ctx.fillRect(-4, 7, 8, 3);
        ctx.beginPath();
        ctx.moveTo(0, 7); ctx.lineTo(-3, 0); ctx.lineTo(4, -4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 7, 1.4, 0, Math.PI * 2);
        ctx.moveTo(-3 + 1.4, 0); ctx.arc(-3, 0, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, -4); ctx.lineTo(6.2, -6);
        ctx.moveTo(4, -4); ctx.lineTo(6.6, -3.4);
        ctx.stroke();
      },
    };

    const resize = () => {
      const rect = hero.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNodes();
    };

    const draw = () => {
      frame += 1;
      ctx.clearRect(0, 0, width, height);

      // Mobile devices roam; base stations stay fixed.
      for (let i = 0; i < nodes.length; i += 1) {
        if (emitters.has(i)) continue;
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        if (n.x <= 0 || n.x >= width) n.vx *= -1;
        if (n.y <= 0 || n.y >= height) n.vy *= -1;
        n.x = Math.max(0, Math.min(width, n.x));
        n.y = Math.max(0, Math.min(height, n.y));

        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < 120) {
          const force = ((120 - d) / 120) * 0.8;
          n.x += (dx / d) * force;
          n.y += (dy / d) * force;
        }
      }

      // Each device attaches to its nearest in-range base station; the link
      // blinks on/off (attach / detach / handover) as the device roams.
      ctx.lineWidth = 1.1;
      for (let i = 0; i < nodes.length; i += 1) {
        if (emitters.has(i)) continue;
        const n = nodes[i];

        let best = -1;
        let bestD = COVERAGE;
        emitters.forEach((ei) => {
          const e = nodes[ei];
          const d = Math.hypot(n.x - e.x, n.y - e.y);
          if (d < bestD) {
            bestD = d;
            best = ei;
          }
        });
        n.linkTarget = best;

        if (frame >= n.nextToggle) {
          n.attached = !n.attached;
          n.nextToggle = frame + 90 + Math.floor(Math.random() * 220);
        }

        const goal = best !== -1 && n.attached ? 1 : 0;
        n.linkStrength += (goal - n.linkStrength) * 0.06;

        if (best !== -1 && n.linkStrength > 0.02) {
          const e = nodes[best];
          ctx.globalAlpha = n.linkStrength * (1 - bestD / COVERAGE) * 0.7;
          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(e.x, e.y);
          ctx.stroke();
        }
      }

      // Wireless signal rings radiating from hub nodes.
      ctx.lineWidth = 1;
      let ringSlot = 0;
      emitters.forEach((idx) => {
        const n = nodes[idx];
        if (!n) return;
        for (let r = 0; r < 2; r += 1) {
          const radius = (frame * 0.5 + ringSlot * 37 + r * (RING_MAX / 2)) % RING_MAX;
          const alpha = (1 - radius / RING_MAX) * 0.4;
          if (alpha <= 0) continue;
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = color;
          ctx.beginPath();
          ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ringSlot += 1;
      });

      // Device glyphs: drones, sensors, phones, towers, base stations,
      // robots, pick-and-place arms, satellites.
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < nodes.length; i += 1) {
        const n = nodes[i];
        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.scale(n.scale, n.scale);
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.3;
        (GLYPHS[n.type] || GLYPHS.sensor)(n);
        ctx.restore();
      }

      // Data packets ride active links between a device and its base station.
      ctx.fillStyle = color;
      for (const p of pulses) {
        const n = nodes[p.dev];
        if (!n || n.linkTarget === -1 || n.linkStrength < 0.4) {
          Object.assign(p, makePulse());
          continue;
        }
        const e = nodes[n.linkTarget];
        p.t += p.speed;
        if (p.t >= 1) {
          p.t = 0;
          p.up = !p.up; // alternate uplink / downlink
        }
        const tt = p.up ? p.t : 1 - p.t;
        ctx.globalAlpha = Math.sin(p.t * Math.PI) * 0.9 * n.linkStrength;
        ctx.beginPath();
        ctx.arc(n.x + (e.x - n.x) * tt, n.y + (e.y - n.y) * tt, 1.9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running || prefersReducedMotion) return;
      running = true;
      raf = requestAnimationFrame(draw);
    };

    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    };

    resize();

    if (prefersReducedMotion) {
      // Render a single static frame.
      draw();
      stop();
    }

    window.addEventListener('resize', () => {
      resize();
      if (prefersReducedMotion) draw();
    });

    window.addEventListener('pointermove', (event) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    }, { passive: true });

    window.addEventListener('pointerout', () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });

    // Refresh node color when the theme changes.
    new MutationObserver(() => {
      color = readAccent();
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) start();
          else stop();
        });
      }, { threshold: 0 });
      observer.observe(hero);
    } else {
      start();
    }
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
  const SHOWCASE_CONTEXT = {
    'rbccps-iisc/CORNET2.0':
      'Network–robot co-simulation middleware from my PhD at RBCCPS, IISc. Couples robot simulators with network emulators to prototype Industry 4.0 warehouse automation. Published at COMSNETS 2022.',
    'rbccps-iisc/CORNET':
      'First-generation co-simulation middleware for multi-UAV and robot networks. Jointly models flight dynamics (Gazebo/ROS) and communication (NS-3) for cyber-physical system design. Published at COMSNETS 2020.',
    'srikrishna3118/modern-systems-engineering':
      'A practical curriculum for systems engineering — curated engineering blogs, hands-on exercises, and patterns for building reliable distributed systems.',
    'rbccps-iisc/5g_opt_drl':
      '5G radio-resource optimization using deep reinforcement learning — exploring intelligent RAN control for next-generation wireless research at RBCCPS.',
    'srikrishna3118/nvidia_auvidea_j120support':
      'Device-tree and kernel support for the NVIDIA Auvidea J120 carrier board on Jetson — hardware bring-up for embedded robotics and edge deployments.',
    'rbccps-iisc/AutonomousDrones':
      'Code and parameters for autonomous drone research at RBCCPS — spanning networked UAV middleware, teleoperations, and multi-robot awareness.',
    'srikrishna3118/ChoiRbot':
      'Collaborative robotics stack for coordinated multi-robot demos — ROS-based control, CMake build, and Dockerized deployment for research prototypes.',
    'rbccps-iisc/DronePort_Controller':
      'Automated drone landing-pad controller that manages touch-down, alignment, and charging to extend continuous flight operations.',
    'rbccps-iisc/video-metadata':
      'Video stream metadata tooling for tele-driving and network-aware robotics experiments with realistic media pipelines.',
  };
  const SHOWCASE_TAGS = {
    'rbccps-iisc/CORNET2.0': ['Python', 'ROS', 'NS-3', 'Co-Simulation'],
    'rbccps-iisc/CORNET': ['Python', 'ROS', 'Gazebo', 'NS-3'],
    'srikrishna3118/modern-systems-engineering': ['Python', 'Systems', 'Curriculum', 'DevOps'],
    'rbccps-iisc/5g_opt_drl': ['Python', '5G', 'Deep RL', 'RAN'],
    'srikrishna3118/nvidia_auvidea_j120support': ['Linux', 'Jetson', 'Device Tree', 'Embedded'],
    'rbccps-iisc/AutonomousDrones': ['Python', 'ROS', 'UAV', 'CPS'],
    'srikrishna3118/ChoiRbot': ['Python', 'ROS', 'Docker', 'Robotics'],
    'rbccps-iisc/DronePort_Controller': ['Embedded', 'Drones', 'IoT', 'Charging'],
    'rbccps-iisc/video-metadata': ['Python', 'Video', 'Tele-driving', 'Metadata'],
  };
  const CACHE_TTL_MS = 60 * 60 * 1000;
  const CACHE_PREFIX = 'gh-cache:';
  const COMMIT_SEARCH_ACCEPT = 'application/vnd.github.cloak-preview+json';

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

  const repoKey = (repo) => repo.full_name || `${repo.owner?.login}/${repo.name}`;

  const getProjectContext = (repo) => {
    const key = typeof repo === 'string' ? repo : repoKey(repo);
    if (typeof repo === 'string') {
      return SHOWCASE_CONTEXT[key] || 'No description provided.';
    }
    return SHOWCASE_CONTEXT[key] || repo.description || 'No description provided.';
  };

  const getProjectTags = (repo) => {
    const key = repoKey(repo);
    if (SHOWCASE_TAGS[key]?.length) return SHOWCASE_TAGS[key];
    const tags = [];
    if (repo.language) tags.push(repo.language);
    (repo.topics || []).slice(0, 3).forEach((topic) => tags.push(topic));
    return tags;
  };

  const isPortfolioRepo = (repo, sourceLogin) => {
    if (repo.fork) return false;
    if (repo.name.endsWith('.github.io')) return false;
    if (repo.name === `${sourceLogin}.github.io`) return false;
    return true;
  };

  const fetchContributedOrgRepos = async (orgLogin, onRateLimited) => {
    const repos = new Set();
    const maxPages = 10;

    for (let page = 1; page <= maxPages; page += 1) {
      const query = encodeURIComponent(`author:${GITHUB_USER} org:${orgLogin}`);
      const cacheKey = `${GITHUB_USER}:commits:${orgLogin}:p${page}`;
      const result = await githubFetch(
        `https://api.github.com/search/commits?q=${query}&per_page=100&page=${page}`,
        cacheKey,
        COMMIT_SEARCH_ACCEPT
      );

      if (result.rateLimited) onRateLimited();

      const items = result.data?.items;
      if (!Array.isArray(items) || items.length === 0) break;

      items.forEach((item) => {
        const fullName = item.repository?.full_name;
        if (fullName && !fullName.endsWith('.github.io')) {
          repos.add(fullName);
        }
      });

      if (items.length < 100) break;
    }

    return repos;
  };

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
    const block = document.querySelector('#hero .metrics-block');
    if (!block) return;

    const run = () => {
      block.querySelectorAll('.stat-value[data-count]').forEach((el) => {
        if (el.getAttribute('data-stat') === 'github-stars') return;
        animateCount(el, el.getAttribute('data-count') ?? '0');
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
      observer.observe(block);
    } else {
      run();
    }
  };

  const initHeroTypewriter = () => {
    const el = document.querySelector('[data-typewriter]');
    if (!el || prefersReducedMotion) return;

    const lines = [
      'Researching co-simulation frameworks for cyber-physical multi-robot systems.',
      'Building GPU-scaled 5G/6G system-level radio simulation platforms at Nokia.',
      'Designing network schedulers and AI-assisted simulation workflows.',
      'Exploring collaborative robotics and multi-robot network awareness.',
    ];

    let lineIndex = 0;
    let charIndex = lines[0].length;
    let deleting = false;

    const tick = () => {
      const current = lines[lineIndex];
      if (!deleting) {
        charIndex += 1;
        el.textContent = current.slice(0, charIndex);
        if (charIndex >= current.length) {
          deleting = true;
          window.setTimeout(tick, 2200);
          return;
        }
        window.setTimeout(tick, 45);
        return;
      }

      charIndex -= 1;
      el.textContent = current.slice(0, charIndex);
      if (charIndex <= 0) {
        deleting = false;
        lineIndex = (lineIndex + 1) % lines.length;
        window.setTimeout(tick, 400);
        return;
      }
      window.setTimeout(tick, 25);
    };

    window.setTimeout(tick, 1800);
  };

  const initGithubStatsAnimation = () => {
    const block = document.querySelector('.projects-section .metrics-block');
    if (!block) return;

    const run = () => {
      block.querySelectorAll('.github-stat-value[data-count]').forEach((el) => {
        animateCount(el, el.getAttribute('data-count') ?? '0');
      });
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            block.__githubStatsVisible = true;
            run();
            observer.disconnect();
          });
        },
        { threshold: 0.25 }
      );
      observer.observe(block);
    } else {
      block.__githubStatsVisible = true;
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
    const projectsEl = document.getElementById('projectsGrid');
    const statusEl = document.getElementById('projectsStatus');
    const modal = document.getElementById('projectModal');

    if (!projectsEl) return;

    let allRepos = [];
    let showcaseRepos = [];
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

      const setGithubStat = (el, value) => {
        if (!el) return;
        el.setAttribute('data-count', String(value));
        const block = document.querySelector('.projects-section .metrics-block');
        if (block?.__githubStatsVisible) {
          animateCount(el, value);
        }
      };

      setGithubStat(reposEl, repos.length);
      setGithubStat(starsEl, totalStars);
      setGithubStat(followersEl, user?.followers ?? 0);

      updateHeroStars(totalStars);
    };

    const updateGithubStatsFromStatic = (stats) => {
      const reposEl = document.querySelector('[data-stat-repos]');
      const starsEl = document.querySelector('[data-stat-stars]');
      const followersEl = document.querySelector('[data-stat-followers]');
      const block = document.querySelector('.projects-section .metrics-block');

      const setGithubStat = (el, value) => {
        if (!el) return;
        el.setAttribute('data-count', String(value));
        if (block?.__githubStatsVisible) animateCount(el, value);
      };

      setGithubStat(reposEl, stats.repos ?? 0);
      setGithubStat(starsEl, stats.stars ?? 0);
      setGithubStat(followersEl, stats.followers ?? 0);

      if (typeof stats.stars === 'number') updateHeroStars(stats.stars);
    };

    // Prefer a pre-baked snapshot (assets/projects.json) so visitors never burn
    // the shared unauthenticated GitHub API budget. Returns true on success.
    const loadStaticProjects = async () => {
      try {
        const response = await fetch('assets/projects.json', { cache: 'no-cache' });
        if (!response.ok) return false;

        const payload = await response.json();
        const projects = Array.isArray(payload?.projects) ? payload.projects : [];
        if (projects.length === 0) return false;

        const byKey = new Map();
        projects.forEach((p) => {
          if (!p?.full_name) return;
          byKey.set(p.full_name, {
            full_name: p.full_name,
            name: p.name,
            html_url: p.html_url,
            homepage: p.homepage || '',
            description: p.description || '',
            stargazers_count: p.stargazers_count || 0,
            forks_count: p.forks_count || 0,
            updated_at: p.updated_at || '',
            license: p.license_spdx ? { spdx_id: p.license_spdx } : null,
            _languages: p.languages || {},
            _readme: typeof p.readme === 'string' ? p.readme : '',
            _static: true,
          });
        });

        showcaseRepos = SHOWCASE_REPOS.map((key) => byKey.get(key)).filter(Boolean);
        if (showcaseRepos.length === 0) return false;
        allRepos = showcaseRepos.slice();

        if (payload.stats) updateGithubStatsFromStatic(payload.stats);
        renderProjects();
        return true;
      } catch {
        return false;
      }
    };

    const getSourceLabel = (ownerLogin) => {
      return GITHUB_SOURCES.find((source) => source.login === ownerLogin)?.label || ownerLogin;
    };

    const ensureShowcaseRepos = async (repoMap) => {
      const missing = SHOWCASE_REPOS.filter((key) => !repoMap.has(key));
      await Promise.all(
        missing.map(async (key) => {
          const result = await githubFetch(`https://api.github.com/repos/${key}`, `${key}:meta`);
          if (result.rateLimited) rateLimited = true;
          if (!result.data?.full_name) return;
          const owner = key.split('/')[0];
          repoMap.set(key, { ...result.data, _sourceLabel: getSourceLabel(owner) });
        })
      );

      showcaseRepos = SHOWCASE_REPOS.map((key) => repoMap.get(key)).filter(Boolean);
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
      const card = document.createElement('article');
      card.className = 'project-showcase-card';
      card.setAttribute('data-repo-full', repoKey(repo));
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `View details for ${repo.name}`);

      const tags = getProjectTags(repo);
      const tagsHtml = tags.length
        ? `<div class="project-showcase-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>`
        : '';

      card.innerHTML = `
        <h3 class="project-showcase-title">${escapeHtml(repo.name)}</h3>
        <p class="project-showcase-desc">${escapeHtml(getProjectContext(repo))}</p>
        ${tagsHtml}
      `;

      const open = () => openProjectModal(repoKey(repo));
      card.addEventListener('click', open);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      });

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
      renderGrid(projectsEl, showcaseRepos, 'Could not load highlighted projects.');
      setStatus(
        rateLimited
          ? 'Showing cached GitHub data (API rate limit reached). Data may be slightly stale.'
          : showcaseRepos.length
            ? `${showcaseRepos.length} highlighted project${showcaseRepos.length === 1 ? '' : 's'}`
            : 'Could not load highlighted projects.'
      );
    };

    const openModal = (el) => {
      if (!el) return;
      el.hidden = false;
      el.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
      if (!modal) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    const openProjectModal = async (repoFullName) => {
      if (!modal) return;
      const repo = allRepos.find((r) => repoKey(r) === repoFullName);
      if (!repo) return;

      const fullName = repoKey(repo);

      const titleEl = document.getElementById('projectModalTitle');
      const descEl = document.getElementById('projectModalDesc');
      const metaEl = document.getElementById('projectModalMeta');
      const langEl = document.getElementById('projectModalLang');
      const actionsEl = document.getElementById('projectModalActions');
      const readmeEl = document.getElementById('projectModalReadme');

      if (titleEl) titleEl.textContent = fullName;
      if (descEl) descEl.textContent = getProjectContext(repo);
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

      openModal(modal);

      try {
        let detail = repo;
        let langs = {};
        let readmeRaw = '';

        if (repo._static) {
          // Everything is baked into assets/projects.json — no API calls.
          langs = repo._languages || {};
          readmeRaw = typeof repo._readme === 'string' ? repo._readme : '';
        } else {
          const detailKey = `${fullName}:detail`;
          const langsKey = `${fullName}:langs`;
          const readmeKey = `${fullName}:readme`;

          const [detailResult, langsResult, readmeResult] = await Promise.all([
            githubFetch(`https://api.github.com/repos/${fullName}`, detailKey),
            githubFetch(`https://api.github.com/repos/${fullName}/languages`, langsKey),
            githubFetch(
              `https://api.github.com/repos/${fullName}/readme`,
              readmeKey,
              'application/vnd.github.raw'
            ),
          ]);

          detail = detailResult.data || repo;
          langs = langsResult.data || {};
          readmeRaw = typeof readmeResult.data === 'string' ? readmeResult.data : '';
        }

        const totalBytes = Object.values(langs).reduce((sum, n) => sum + n, 0);

        if (titleEl) titleEl.textContent = detail.full_name || repo.name;
        if (descEl) descEl.textContent = getProjectContext(repo);

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
          const raw = readmeRaw;
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
      projectsEl.innerHTML = '<p class="projects-loading">Loading projects...</p>';

      try {
        const orgSources = GITHUB_SOURCES.filter((source) => source.type === 'org');
        const markRateLimited = () => {
          rateLimited = true;
        };

        const repoRequests = GITHUB_SOURCES.map((source) => {
          const url = source.type === 'org'
            ? `https://api.github.com/orgs/${source.login}/repos?per_page=100&sort=updated&type=public`
            : `https://api.github.com/users/${source.login}/repos?per_page=100&sort=updated`;
          return githubFetch(url, `${source.login}:repos`).then((result) => ({ ...result, source }));
        });

        const contributedRequests = orgSources.map((source) =>
          fetchContributedOrgRepos(source.login, markRateLimited).then((repos) => ({
            login: source.login,
            repos,
          }))
        );

        const [repoResults, userResult, ...contributedResults] = await Promise.all([
          Promise.all(repoRequests),
          githubFetch(`https://api.github.com/users/${GITHUB_USER}`, `${GITHUB_USER}:user`),
          ...contributedRequests,
        ]);

        rateLimited = rateLimited
          || repoResults.some((result) => result.rateLimited)
          || Boolean(userResult.rateLimited);

        const contributedByOrg = new Map(
          contributedResults.map(({ login, repos }) => [login, repos])
        );

        const merged = new Map();

        repoResults.forEach(({ data, source }) => {
          const repos = Array.isArray(data) ? data : [];
          const contributed = contributedByOrg.get(source.login);

          repos.forEach((repo) => {
            if (!isPortfolioRepo(repo, source.login)) return;
            if (source.type === 'org' && !contributed?.has(repoKey(repo))) return;
            merged.set(repoKey(repo), { ...repo, _sourceLabel: source.label });
          });
        });

        allRepos = Array.from(merged.values());
        await ensureShowcaseRepos(merged);

        showcaseRepos.forEach((repo) => {
          if (!allRepos.some((entry) => repoKey(entry) === repoKey(repo))) {
            allRepos.push(repo);
          }
        });

        updateGithubStats(allRepos, userResult.data);
        renderProjects();
      } catch {
        setStatus('Unable to load GitHub projects. Visit the profile on GitHub instead.', true);
        projectsEl.innerHTML = `<p class="projects-error">Could not load projects. <a href="https://github.com/${GITHUB_USER}" target="_blank" rel="noopener">View ${GITHUB_USER} on GitHub</a></p>`;
      }
    };

    modal?.querySelectorAll('[data-modal-close]').forEach((el) => {
      el.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
    });

    loadStaticProjects().then((ok) => {
      if (!ok) loadProjects();
    });
  };

  const init = () => {
    root.classList.add('js');
    initTheme();
    initSmoothAnchors();
    initScrollSpy();
    initScrollProgress();
    initStaggerReveal();
    initReveal();
    initCopyButtons();
    initBackToTop();
    initTimeline();
    initTimelineProgress();
    initImpactStats();
    initHeroTypewriter();
    initHeroNetwork();
    initCardSpotlight();
    initGithubStatsAnimation();
    initResearchFilters();
    initProjects();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
