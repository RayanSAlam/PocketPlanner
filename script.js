(function () {
  // Local dev server for the Team 3C (Lovable) app — `npm run dev` in that
  // folder serves it here (falls back to 8081+ if 8080 is already taken).
  // Swap this to the published Lovable/custom-domain URL once the app is
  // live; every Sign Up / Log In link updates from this one spot.
  var APP_URL = 'http://localhost:8081';

  document.querySelectorAll('[data-auth-link]').forEach(function (link) {
    var mode = link.getAttribute('data-auth-link');
    link.href = APP_URL + '/auth?mode=' + mode;
  });
})();

(function () {
  var toggle = document.getElementById('themeToggle');
  var label = toggle && toggle.querySelector('.toggle-label');
  if (!toggle || !label) return;

  function applyState() {
    var isDark = document.body.classList.contains('dark');
    label.textContent = isDark ? 'Light mode' : 'Dark mode';
  }

  function flipTheme() {
    document.body.classList.toggle('dark');
    applyState();
    if (window.__pocketPlannerRefreshCharts) window.__pocketPlannerRefreshCharts();
  }

  toggle.addEventListener('click', function (e) {
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      flipTheme();
      return;
    }

    var x = e.clientX;
    var y = e.clientY;
    var endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    var transition = document.startViewTransition(flipTheme);

    transition.ready.then(function () {
      document.documentElement.animate(
        {
          clipPath: [
            'circle(0px at ' + x + 'px ' + y + 'px)',
            'circle(' + endRadius + 'px at ' + x + 'px ' + y + 'px)',
          ],
        },
        {
          duration: 650,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  });
})();

(function () {
  var EXPAND_SCROLL_THRESHOLD = 80;

  var nav = document.getElementById('animNav');
  if (!nav) return;

  var isExpanded = true;
  var lastScrollY = window.scrollY;
  var scrollPositionOnCollapse = 0;

  window.addEventListener('load', function () {
    nav.classList.add('loaded');
  });

  function setExpanded(value) {
    isExpanded = value;
    nav.classList.toggle('collapsed', !value);
  }

  window.addEventListener('scroll', function () {
    var latest = window.scrollY;

    if (isExpanded && latest > lastScrollY && latest > 150) {
      setExpanded(false);
      scrollPositionOnCollapse = latest;
    } else if (!isExpanded && latest < lastScrollY && (scrollPositionOnCollapse - latest > EXPAND_SCROLL_THRESHOLD)) {
      setExpanded(true);
    }

    lastScrollY = latest;
  }, { passive: true });

  nav.addEventListener('click', function (e) {
    if (!isExpanded) {
      e.preventDefault();
      setExpanded(true);
    }
  });

  var links = nav.querySelectorAll('.anim-nav-links a');
  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.stopPropagation();
    });
  });
})();

(function () {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  var container = document.getElementById('home');
  var mainCard = document.getElementById('mainCard');
  var mockup = document.getElementById('mockup');
  if (!container || !mainCard || !mockup) return;

  var METRIC_VALUE = 84;
  var isMobile = window.innerWidth < 768;
  var rafId = 0;

  function handleMouseMove(e) {
    if (window.scrollY > window.innerHeight * 2) return;

    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function () {
      var rect = mainCard.getBoundingClientRect();
      var mouseX = e.clientX - rect.left;
      var mouseY = e.clientY - rect.top;

      mainCard.style.setProperty('--mouse-x', mouseX + 'px');
      mainCard.style.setProperty('--mouse-y', mouseY + 'px');

      var xVal = (e.clientX / window.innerWidth - 0.5) * 2;
      var yVal = (e.clientY / window.innerHeight - 0.5) * 2;

      gsap.to(mockup, {
        rotationY: xVal * 12,
        rotationX: -yVal * 12,
        ease: 'power3.out',
        duration: 1.2,
      });
    });
  }

  window.addEventListener('mousemove', handleMouseMove);

  var ctx = gsap.context(function () {
    gsap.set('.text-track', { autoAlpha: 0, y: 60, scale: 0.85, filter: 'blur(20px)', rotationX: -20 });
    gsap.set('.text-days', { autoAlpha: 1, clipPath: 'inset(0 100% 0 0)' });
    gsap.set('.main-card', { y: window.innerHeight + 200, autoAlpha: 1 });
    gsap.set(['.card-left-text', '.card-right-text', '.mockup-scroll-wrapper', '.floating-badge', '.phone-widget'], { autoAlpha: 0 });

    var introTl = gsap.timeline({ delay: 0.3 });
    introTl
      .to('.text-track', { duration: 1.8, autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', rotationX: 0, ease: 'expo.out' })
      .to('.text-days', { duration: 1.4, clipPath: 'inset(0 0% 0 0)', ease: 'power4.inOut' }, '-=1.0');

    var scrollTl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: '+=6000',
        pin: true,
        scrub: 1,
        anticipatePin: 1,
      },
    });

    scrollTl
      .to(['.hero-text-wrapper', '.bg-grid-theme'], { scale: 1.15, filter: 'blur(20px)', opacity: 0.2, ease: 'power2.inOut', duration: 2 }, 0)
      .to('.main-card', { y: 0, ease: 'power3.inOut', duration: 2 }, 0)
      .to('.main-card', { width: '100%', height: '100%', borderRadius: '0px', ease: 'power3.inOut', duration: 1.5 })
      .fromTo('.mockup-scroll-wrapper',
        { y: 300, z: -500, rotationX: 50, rotationY: -30, autoAlpha: 0, scale: 0.6 },
        { y: 0, z: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, ease: 'expo.out', duration: 2.5 }, '-=0.8'
      )
      .fromTo('.phone-widget', { y: 40, autoAlpha: 0, scale: 0.95 }, { y: 0, autoAlpha: 1, scale: 1, stagger: 0.15, ease: 'back.out(1.2)', duration: 1.5 }, '-=1.5')
      .to('.progress-ring', { strokeDashoffset: 60, duration: 2, ease: 'power3.inOut' }, '-=1.2')
      .to('.counter-val', { innerHTML: METRIC_VALUE, snap: { innerHTML: 1 }, duration: 2, ease: 'expo.out' }, '-=2.0')
      .fromTo('.floating-badge', { y: 100, autoAlpha: 0, scale: 0.7, rotationZ: -10 }, { y: 0, autoAlpha: 1, scale: 1, rotationZ: 0, ease: 'back.out(1.5)', duration: 1.5, stagger: 0.2 }, '-=2.0')
      .fromTo('.card-left-text', { x: -50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: 'power4.out', duration: 1.5 }, '-=1.5')
      .fromTo('.card-right-text', { x: 50, autoAlpha: 0, scale: 0.8 }, { x: 0, autoAlpha: 1, scale: 1, ease: 'expo.out', duration: 1.5 }, '<')
      .set('.hero-text-wrapper', { autoAlpha: 0 })
      .to({}, { duration: 2 })
      .to(['.mockup-scroll-wrapper', '.floating-badge', '.card-left-text', '.card-right-text'], {
        scale: 0.9, y: -40, z: -200, autoAlpha: 0, ease: 'power3.in', duration: 1.2, stagger: 0.05,
      })
      .to('.main-card', { y: -window.innerHeight - 300, ease: 'power3.in', duration: 1.5 });
  }, container);
})();

(function () {
  if (!window.Chart) return;

  var section = document.querySelector('.stats-section');
  var debtEl = document.getElementById('chartDebt');
  var emergencyEl = document.getElementById('chartEmergency');
  var paycheckEl = document.getElementById('chartPaycheck');
  if (!section) return;

  function readColors() {
    var s = getComputedStyle(section);
    return {
      surface: s.getPropertyValue('--chart-surface').trim(),
      ink: s.getPropertyValue('--chart-ink').trim(),
      inkSoft: s.getPropertyValue('--chart-ink-soft').trim(),
      grid: s.getPropertyValue('--chart-grid').trim(),
      sage: s.getPropertyValue('--chart-sage').trim(),
      rose: s.getPropertyValue('--chart-rose').trim(),
      gold: s.getPropertyValue('--chart-gold').trim(),
      rose1: s.getPropertyValue('--chart-rose-1').trim(),
      rose2: s.getPropertyValue('--chart-rose-2').trim(),
      rose3: s.getPropertyValue('--chart-rose-3').trim(),
      line: s.getPropertyValue('--chart-line').trim(),
      lineFill: s.getPropertyValue('--chart-line-fill').trim(),
    };
  }

  var colors = readColors();
  Chart.defaults.font.family = "'Work Sans', sans-serif";
  Chart.defaults.color = colors.inkSoft;
  Chart.defaults.animation.duration = 1100;
  Chart.defaults.animation.easing = 'easeOutQuart';

  var barEndLabels = {
    id: 'barEndLabels',
    afterDatasetsDraw: function (chart) {
      var ctx = chart.ctx;
      var meta = chart.getDatasetMeta(0);
      var data = chart.data.datasets[0].data;
      ctx.save();
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillStyle = colors.ink;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      meta.data.forEach(function (bar, i) {
        ctx.fillText(data[i] + '%', bar.x + 8, bar.y);
      });
      ctx.restore();
    },
  };

  var lineEndLabel = {
    id: 'lineEndLabel',
    afterDatasetsDraw: function (chart) {
      var meta = chart.getDatasetMeta(0);
      var last = meta.data[meta.data.length - 1];
      if (!last) return;
      var ctx = chart.ctx;
      ctx.save();
      ctx.font = '700 13px "IBM Plex Mono", monospace';
      ctx.fillStyle = colors.line;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText('$1.28T', last.x + 10, last.y);
      ctx.restore();
    },
  };

  var chartMakers = {
    line: function () {
      if (!debtEl) return null;
      return new Chart(debtEl, {
        type: 'line',
        data: {
          datasets: [{
            data: [
              { x: 2019, y: 0.93 },
              { x: 2021, y: 0.77 },
              { x: 2023, y: 0.99 },
              { x: 2024, y: 1.21 },
              { x: 2025, y: 1.28 },
            ],
            borderColor: colors.line,
            backgroundColor: colors.lineFill,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: colors.line,
            fill: true,
            tension: 0.35,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { right: 46, top: 8 } },
          scales: {
            x: {
              type: 'linear',
              min: 2019, max: 2025,
              ticks: { stepSize: 2, color: 'rgba(255,255,255,0.4)', font: { size: 11 } },
              grid: { display: false },
              border: { color: 'rgba(255,255,255,0.15)' },
            },
            y: {
              min: 0.6, max: 1.4,
              ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 }, callback: function (v) { return '$' + v + 'T'; } },
              grid: { color: 'rgba(255,255,255,0.08)' },
              border: { display: false },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0A0F0A',
              titleColor: '#fff',
              bodyColor: 'rgba(255,255,255,0.7)',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              padding: 10,
              callbacks: { label: function (item) { return '$' + item.raw.y + 'T total debt'; } },
            },
          },
        },
        plugins: [lineEndLabel],
      });
    },
    doughnut: function () {
      if (!emergencyEl) return null;
      return new Chart(emergencyEl, {
        type: 'doughnut',
        data: {
          labels: ['Savings — 41%', 'Credit card — 25%', 'Other / unable — 34%'],
          datasets: [{
            data: [41, 25, 34],
            backgroundColor: [colors.sage, colors.rose, colors.gold],
            borderColor: colors.surface,
            borderWidth: 2,
            hoverOffset: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 10, boxHeight: 10, padding: 12, font: { size: 11 }, color: colors.inkSoft },
            },
            tooltip: {
              backgroundColor: colors.surface,
              titleColor: colors.ink,
              bodyColor: colors.inkSoft,
              borderColor: colors.grid,
              borderWidth: 1,
              padding: 10,
              callbacks: { label: function (item) { return item.label; } },
            },
          },
        },
      });
    },
    bar: function () {
      if (!paycheckEl) return null;
      return new Chart(paycheckEl, {
        type: 'bar',
        data: {
          labels: ['Gen Z', 'Millennials', 'All adults'],
          datasets: [{
            data: [72, 65, 57],
            backgroundColor: [colors.rose3, colors.rose2, colors.rose1],
            borderRadius: 6,
            maxBarThickness: 22,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { right: 36 } },
          scales: {
            x: {
              min: 0, max: 100,
              grid: { color: colors.grid, drawTicks: false },
              ticks: { display: false },
              border: { display: false },
            },
            y: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: colors.inkSoft, font: { size: 12 } },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: colors.surface,
              titleColor: colors.ink,
              bodyColor: colors.inkSoft,
              borderColor: colors.grid,
              borderWidth: 1,
              padding: 10,
              callbacks: { label: function (item) { return item.raw + '%'; } },
            },
          },
        },
        plugins: [barEndLabels],
      });
    },
  };

  var charts = { line: null, doughnut: null, bar: null };

  window.__pocketPlannerRefreshCharts = function () {
    colors = readColors();
    Chart.defaults.color = colors.inkSoft;

    if (charts.doughnut) {
      charts.doughnut.data.datasets[0].backgroundColor = [colors.sage, colors.rose, colors.gold];
      charts.doughnut.data.datasets[0].borderColor = colors.surface;
      charts.doughnut.options.plugins.legend.labels.color = colors.inkSoft;
      charts.doughnut.options.plugins.tooltip.backgroundColor = colors.surface;
      charts.doughnut.options.plugins.tooltip.titleColor = colors.ink;
      charts.doughnut.options.plugins.tooltip.bodyColor = colors.inkSoft;
      charts.doughnut.options.plugins.tooltip.borderColor = colors.grid;
      charts.doughnut.update();
    }

    if (charts.bar) {
      charts.bar.data.datasets[0].backgroundColor = [colors.rose3, colors.rose2, colors.rose1];
      charts.bar.options.scales.x.grid.color = colors.grid;
      charts.bar.options.scales.y.ticks.color = colors.inkSoft;
      charts.bar.options.plugins.tooltip.backgroundColor = colors.surface;
      charts.bar.options.plugins.tooltip.titleColor = colors.ink;
      charts.bar.options.plugins.tooltip.bodyColor = colors.inkSoft;
      charts.bar.options.plugins.tooltip.borderColor = colors.grid;
      charts.bar.update();
    }

    if (charts.line) {
      charts.line.data.datasets[0].borderColor = colors.line;
      charts.line.data.datasets[0].backgroundColor = colors.lineFill;
      charts.line.data.datasets[0].pointBackgroundColor = colors.line;
      charts.line.update();
    }
  };

  var meterFill = document.getElementById('meterFill');
  var meterCount = document.querySelector('.meter-count');

  function animateMeter() {
    if (!meterFill || !meterCount) return;
    var target = parseInt(meterCount.getAttribute('data-target'), 10) || 0;
    meterFill.style.width = target + '%';
    if (window.gsap) {
      gsap.to(meterCount, { innerHTML: target, snap: { innerHTML: 1 }, duration: 1.4, ease: 'power2.out' });
    } else {
      meterCount.textContent = target;
    }
  }

  var cards = document.querySelectorAll('.chart-card.reveal');

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var card = entry.target;
        card.classList.add('is-visible');

        if (card.classList.contains('card-line') && !charts.line) charts.line = chartMakers.line();
        if (card.classList.contains('card-doughnut') && !charts.doughnut) charts.doughnut = chartMakers.doughnut();
        if (card.classList.contains('card-bar') && !charts.bar) charts.bar = chartMakers.bar();
        if (card.classList.contains('card-meter')) animateMeter();

        observer.unobserve(card);
      });
    }, { threshold: 0.25 });

    cards.forEach(function (card) { observer.observe(card); });
  } else {
    cards.forEach(function (card) { card.classList.add('is-visible'); });
    charts.line = chartMakers.line();
    charts.doughnut = chartMakers.doughnut();
    charts.bar = chartMakers.bar();
    animateMeter();
  }
})();

(function () {
  var TESTIMONIALS = [
    {
      quote: 'PocketPlanner showed me exactly where my money was leaking — fixed it in a week.',
      author: 'Maria Chen',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&auto=format&fit=crop',
      alt: 'Portrait of Maria Chen',
    },
    {
      quote: "First budgeting app that's made this feel calm instead of stressful.",
      author: 'David Okafor',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80&auto=format&fit=crop',
      alt: 'Portrait of David Okafor',
    },
    {
      quote: 'I finally built a real emergency fund. This is the app that got me there.',
      author: 'Priya Nair',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80&auto=format&fit=crop',
      alt: 'Portrait of Priya Nair',
    },
  ];

  var CELL = 148;
  var GAP = 8;
  var STEP = 3 * (CELL + GAP);
  var EXIT_MS = 240;
  var SLIDE_MS = 800;
  var CHAR_STAGGER_MS = 6;

  var reel = document.getElementById('testimonialReel');
  var leftCol = document.getElementById('reelLeft');
  var midCol = document.getElementById('reelMiddle');
  var rightCol = document.getElementById('reelRight');
  var reelQuote = document.getElementById('reelQuote');
  var reelAuthor = document.getElementById('reelAuthor');
  var reelSizer = document.getElementById('reelSizer');
  var reelTextActive = document.getElementById('reelTextActive');
  var prevBtn = document.getElementById('reelPrev');
  var nextBtn = document.getElementById('reelNext');

  if (!reel || !leftCol || !midCol || !rightCol || !reelQuote || !reelAuthor || !prevBtn || !nextBtn) return;

  var count = TESTIMONIALS.length;
  var sideCellCount = 4 + 2 * count;
  var centerIdx = (count - 1) / 2;

  function makeCell() {
    var el = document.createElement('div');
    el.className = 'reel-cell';
    el.style.width = CELL + 'px';
    el.style.height = CELL + 'px';
    return el;
  }

  function makeFeatured(t) {
    var wrap = document.createElement('div');
    wrap.className = 'reel-featured';
    wrap.style.width = CELL + 'px';
    wrap.style.height = CELL + 'px';

    var img = document.createElement('img');
    img.src = t.image;
    img.alt = t.alt || '';
    img.loading = 'lazy';
    wrap.appendChild(img);

    var desat = document.createElement('div');
    desat.className = 'reel-desat';
    wrap.appendChild(desat);

    var sheen = document.createElement('div');
    sheen.className = 'reel-sheen';
    wrap.appendChild(sheen);

    return wrap;
  }

  for (var i = 0; i < sideCellCount; i++) {
    leftCol.appendChild(makeCell());
    rightCol.appendChild(makeCell());
  }

  for (var j = 0; j < 3; j++) midCol.appendChild(makeCell());
  TESTIMONIALS.forEach(function (t, i) {
    midCol.appendChild(makeFeatured(t));
    if (i < count - 1) {
      midCol.appendChild(makeCell());
      midCol.appendChild(makeCell());
    }
  });
  for (var k = 0; k < 3; k++) midCol.appendChild(makeCell());

  function setColumnsY(index) {
    var middleY = (centerIdx - index) * STEP;
    var sideY = -middleY;
    midCol.style.transform = 'translateY(' + middleY + 'px)';
    leftCol.style.transform = 'translateY(' + sideY + 'px)';
    rightCol.style.transform = 'translateY(' + sideY + 'px)';
  }

  function buildChars(container, text, staggerMs) {
    container.textContent = '';
    var idx = 0;
    var words = text.split(' ');
    words.forEach(function (word, wi) {
      var wordSpan = document.createElement('span');
      wordSpan.style.display = 'inline-block';
      wordSpan.style.whiteSpace = 'nowrap';
      Array.prototype.forEach.call(word, function (ch) {
        var charSpan = document.createElement('span');
        charSpan.className = 'reel-char';
        charSpan.style.animationDelay = (idx * staggerMs) + 'ms';
        charSpan.textContent = ch;
        wordSpan.appendChild(charSpan);
        idx++;
      });
      container.appendChild(wordSpan);
      if (wi < words.length - 1) {
        container.appendChild(document.createTextNode(' '));
        idx++;
      }
    });
  }

  function renderText(t) {
    buildChars(reelQuote, t.quote, CHAR_STAGGER_MS);
    buildChars(reelAuthor, t.author, CHAR_STAGGER_MS);
    if (reelSizer) {
      var sizerQuote = reelSizer.querySelector('.reel-quote');
      var sizerAuthor = reelSizer.querySelector('.reel-author');
      if (sizerQuote) sizerQuote.textContent = t.quote;
      if (sizerAuthor) sizerAuthor.textContent = t.author;
    }
  }

  function updateButtons(index) {
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === count - 1;
  }

  var index = 0;
  var displayIndex = 0;
  var animating = false;

  setColumnsY(index);
  renderText(TESTIMONIALS[displayIndex]);
  updateButtons(index);

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      reel.classList.add('mounted');
    });
  });

  function paginate(dir) {
    if (animating) return;
    var next = index + dir;
    if (next < 0 || next >= count) return;

    animating = true;
    index = next;
    setColumnsY(index);
    updateButtons(index);

    if (reelTextActive) reelTextActive.classList.add('exiting');

    setTimeout(function () {
      displayIndex = next;
      renderText(TESTIMONIALS[displayIndex]);
      if (reelTextActive) reelTextActive.classList.remove('exiting');
    }, EXIT_MS);

    setTimeout(function () {
      animating = false;
    }, SLIDE_MS);
  }

  prevBtn.addEventListener('click', function () { paginate(-1); });
  nextBtn.addEventListener('click', function () { paginate(1); });

  reel.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); paginate(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); paginate(-1); }
  });
})();

(function () {
  var section = document.getElementById('mission');
  var eyebrow = document.getElementById('missionEyebrow');
  var heading = document.getElementById('missionHeading');
  var desc = document.getElementById('missionDesc');
  if (!section || !heading) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function reveal() {
    if (!window.gsap || reduceMotion) {
      [eyebrow, heading, desc].forEach(function (el) {
        if (el) el.style.visibility = 'visible';
      });
      return;
    }

    gsap.set([eyebrow, heading, desc], { autoAlpha: 0, y: 40, scale: 0.94, filter: 'blur(14px)' });

    gsap.timeline()
      .to(eyebrow, { duration: 0.8, autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', ease: 'expo.out' })
      .to(heading, { duration: 1.1, autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', ease: 'expo.out' }, '-=0.5')
      .to(desc, { duration: 0.9, autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', ease: 'expo.out' }, '-=0.7');
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal();
          observer.unobserve(section);
        }
      });
    }, { threshold: 0.4 });
    observer.observe(section);
  } else {
    reveal();
  }
})();

(function () {
  var cards = document.querySelectorAll('.feature-card.reveal');
  if (!cards.length) return;

  if (!('IntersectionObserver' in window)) {
    cards.forEach(function (card) { card.classList.add('is-visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2 });

  cards.forEach(function (card) { observer.observe(card); });
})();

(function () {
  var section = document.getElementById('cta');
  var eyebrow = document.getElementById('ctaEyebrow');
  var heading = document.getElementById('ctaHeading');
  var sub = document.getElementById('ctaSub');
  var buttons = document.getElementById('ctaButtons');
  if (!section || !heading) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function reveal() {
    if (!window.gsap || reduceMotion) {
      [eyebrow, heading, sub, buttons].forEach(function (el) {
        if (el) el.style.visibility = 'visible';
      });
      return;
    }

    gsap.set([eyebrow, heading, sub, buttons], { autoAlpha: 0, y: 40, scale: 0.94, filter: 'blur(14px)' });

    gsap.timeline()
      .to(eyebrow, { duration: 0.8, autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', ease: 'expo.out' })
      .to(heading, { duration: 1.1, autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', ease: 'expo.out' }, '-=0.5')
      .to(sub, { duration: 0.9, autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', ease: 'expo.out' }, '-=0.7')
      .to(buttons, { duration: 0.9, autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', ease: 'expo.out' }, '-=0.6');
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          reveal();
          observer.unobserve(section);
        }
      });
    }, { threshold: 0.35 });
    observer.observe(section);
  } else {
    reveal();
  }
})();
