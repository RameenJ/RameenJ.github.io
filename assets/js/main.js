// /signal — interaction layer. Everything degrades gracefully; the site
// is fully readable with JS off or reduced-motion on.

(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     Ticker — duplicate content once so the 50%-translate loop is seamless
  --------------------------------------------------------------------- */
  document.querySelectorAll('.ticker__track').forEach(function (track) {
    track.innerHTML += track.innerHTML;
  });

  /* ---------------------------------------------------------------------
     Reveal on scroll
  --------------------------------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (!reduceMotion && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            var delay = e.target.dataset.delay || 0;
            setTimeout(function () { e.target.classList.add('is-visible'); }, delay);
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  /* ---------------------------------------------------------------------
     Animated counters — data-count="74.3" data-suffix="%"
  --------------------------------------------------------------------- */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    var animateCounter = function (el) {
      var target = parseFloat(el.dataset.count);
      var suffix = el.dataset.suffix || '';
      var decimals = (el.dataset.count.split('.')[1] || '').length;
      if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
      var start = null, duration = 1200;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { animateCounter(e.target); cio.unobserve(e.target); }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { cio.observe(el); });
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* ---------------------------------------------------------------------
     Terminal typing effect
  --------------------------------------------------------------------- */
  var termEl = document.getElementById('term-typed');
  if (termEl) {
    var lines = JSON.parse(termEl.dataset.lines || '[]');
    if (reduceMotion) {
      termEl.innerHTML = lines.join('\n');
    } else {
      var li = 0, ci = 0, out = '';
      function typeNext() {
        if (li >= lines.length) return;
        var line = lines[li];
        if (ci <= line.length) {
          termEl.innerHTML = out + line.slice(0, ci) + '<span class="cursor">&nbsp;</span>';
          ci++;
          setTimeout(typeNext, line.charAt(ci - 1) === '\n' ? 0 : 14 + Math.random() * 18);
        } else {
          out += line + '\n';
          li++; ci = 0;
          setTimeout(typeNext, 260);
        }
      }
      setTimeout(typeNext, 400);
    }
  }

  /* ---------------------------------------------------------------------
     Issue / status date stamp
  --------------------------------------------------------------------- */
  document.querySelectorAll('[data-issue-date]').forEach(function (stamp) {
    var d = new Date();
    var opts = { year: 'numeric', month: 'short', day: '2-digit' };
    stamp.textContent = d.toLocaleDateString('en-GB', opts).toUpperCase();
  });

  /* ---------------------------------------------------------------------
     Card tilt (subtle, desktop only, disabled for reduced motion)
  --------------------------------------------------------------------- */
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.proj-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(900px) rotateX(' + (y * -3) + 'deg) rotateY(' + (x * 3) + 'deg) translateY(-4px)';
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------------------
     Background canvas — drifting node network, mouse-reactive parallax
  --------------------------------------------------------------------- */
  var bgCanvas = document.getElementById('bg-canvas');
  if (bgCanvas && !reduceMotion) {
    var ctx = bgCanvas.getContext('2d');
    var W, H, nodes = [];
    var mouse = { x: 0, y: 0 };
    var NODE_COUNT = window.innerWidth < 700 ? 34 : 64;

    function resize() {
      W = bgCanvas.width = window.innerWidth;
      H = bgCanvas.height = window.innerHeight;
    }
    function initNodes() {
      nodes = [];
      for (var i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18,
          r: Math.random() * 1.4 + 0.6
        });
      }
    }
    resize(); initNodes();
    window.addEventListener('resize', function () { resize(); initNodes(); });
    window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });

    var maxDist = 150;
    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;

        var dxm = n.x - mouse.x, dym = n.y - mouse.y;
        var dm = Math.sqrt(dxm * dxm + dym * dym);
        if (dm < 160) { n.x += dxm / dm * 0.25; n.y += dym / dm * 0.25; }

        for (var j = i + 1; j < nodes.length; j++) {
          var o = nodes[j];
          var dx = n.x - o.x, dy = n.y - o.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            ctx.strokeStyle = 'rgba(139,107,255,' + (0.12 * (1 - dist / maxDist)) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(o.x, o.y); ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(51,229,214,0.45)';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------------
     Mini viz: regime timeline bar (cycles color blocks like a Gantt strip)
  --------------------------------------------------------------------- */
  function drawRegimeStrip(canvas) {
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    function size() {
      var rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); window.addEventListener('resize', size);

    var colors = ['#3DDC84', '#8B6BFF', '#FF6B6B', '#33E5D6']; // risk-on, inflation, high-vol, risk-off-ish
    var segments = [];
    var seed = 7;
    function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var x = 0, W = 900;
    while (x < W) {
      var w = 30 + rand() * 90;
      segments.push({ x: x, w: w, c: colors[Math.floor(rand() * colors.length)] });
      x += w;
    }
    var t0 = null;
    function draw(ts) {
      if (!t0) t0 = ts;
      var rect = canvas.getBoundingClientRect();
      var w = rect.width, h = rect.height;
      ctx.clearRect(0, 0, w, h);
      var scale = w / W;
      var scanX = reduceMotion ? 0 : ((ts - t0) / 40) % (W + 200) - 200;
      segments.forEach(function (s) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = s.c;
        ctx.fillRect(s.x * scale, h * 0.42, s.w * scale - 1, h * 0.34);
      });
      ctx.globalAlpha = 1;
      // scanning highlight
      var grad = ctx.createLinearGradient(scanX * scale - 40, 0, scanX * scale + 40, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.35)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, h * 0.42, w, h * 0.34);
      // baseline
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.moveTo(0, h * 0.42 + h * 0.34 + 10); ctx.lineTo(w, h * 0.42 + h * 0.34 + 10); ctx.stroke();
      if (!reduceMotion) requestAnimationFrame(draw); else return;
    }
    requestAnimationFrame(draw);
  }

  /* ---------------------------------------------------------------------
     Mini viz: forecast line + calibrated confidence band
  --------------------------------------------------------------------- */
  function drawForecastLine(canvas) {
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    function size() {
      var rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size(); window.addEventListener('resize', size);

    var N = 60, pts = [], seed = 3;
    function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var v = 0.5;
    for (var i = 0; i < N; i++) {
      v += (rand() - 0.5) * 0.12;
      v = Math.max(0.15, Math.min(0.85, v));
      pts.push(v);
    }
    var t0 = null;
    function draw(ts) {
      if (!t0) t0 = ts;
      var rect = canvas.getBoundingClientRect();
      var w = rect.width, h = rect.height, pad = 14;
      ctx.clearRect(0, 0, w, h);
      var reveal = reduceMotion ? N : Math.min(N, Math.floor((ts - t0) / 45));

      // confidence band
      ctx.beginPath();
      for (i = 0; i < reveal; i++) {
        var x = pad + (w - pad * 2) * (i / (N - 1));
        var y = h - pad - (pts[i] + 0.12) * (h - pad * 2);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      for (i = reveal - 1; i >= 0; i--) {
        var x2 = pad + (w - pad * 2) * (i / (N - 1));
        var y2 = h - pad - (pts[i] - 0.12) * (h - pad * 2);
        ctx.lineTo(x2, y2);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(51,229,214,0.10)';
      ctx.fill();

      // line
      ctx.beginPath();
      for (i = 0; i < reveal; i++) {
        var lx = pad + (w - pad * 2) * (i / (N - 1));
        var ly = h - pad - pts[i] * (h - pad * 2);
        i === 0 ? ctx.moveTo(lx, ly) : ctx.lineTo(lx, ly);
      }
      ctx.strokeStyle = '#33E5D6';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // leading dot
      if (reveal > 0 && reveal <= N) {
        var lastX = pad + (w - pad * 2) * ((reveal - 1) / (N - 1));
        var lastY = h - pad - pts[reveal - 1] * (h - pad * 2);
        ctx.beginPath(); ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#8B6BFF'; ctx.fill();
      }

      if (!reduceMotion && reveal < N + 40) requestAnimationFrame(draw);
      else if (!reduceMotion) { t0 = null; requestAnimationFrame(draw); }
    }
    requestAnimationFrame(draw);
  }

  document.querySelectorAll('[data-viz="regime"]').forEach(drawRegimeStrip);
  document.querySelectorAll('[data-viz="forecast"]').forEach(drawForecastLine);

})();
