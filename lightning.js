// lightning.js (DPR + responsive fix)
// Replaces previous file. Ensures canvas uses devicePixelRatio so lightning aligns on mobile.

(() => {
  // config
  const START_DELAY = 900;
  const SEGMENT_COUNT = 20;
  const SMOKE_COUNT = 30;

  // DOM checks
  const heroTitle = document.getElementById('heroTitle');
  const heroName = document.getElementById('heroName');
  if (!heroTitle || !heroName) return;

  // canvas (exists in HTML)
  const canvas = document.getElementById('lightning-canvas') || (() => {
    const c = document.createElement('canvas');
    c.id = 'lightning-canvas';
    document.body.appendChild(c);
    return c;
  })();
  const ctx = canvas.getContext('2d');

  // State
  let smokeParticles = [];
  let lightningSegments = [];
  let lightningActive = true;
  let animationRunning = false;

  // Responsive canvas with DPR handling
  function resizeCanvas() {
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // set CSS size (so layout/positioning uses CSS pixels)
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';

    // set internal pixel buffer size scaled by DPR
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    // map drawing operations so we can use CSS pixels in our coordinates
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', () => {
    resizeCanvas();
    // clear segments so we recompute fresh positions (avoid leftover points)
    lightningSegments = [];
  }, { passive: true });
  resizeCanvas();

  // Break the heroTitle into letter spans (preserve spaces)
  const originalTitle = heroTitle.textContent.trim() || "Software Engineer";
  heroTitle.textContent = '';
  heroTitle.style.whiteSpace = 'nowrap';
  const letterSpans = [];
  for (const ch of originalTitle) {
    const span = document.createElement('span');
    span.className = 'software-letter';
    span.textContent = ch;
    heroTitle.appendChild(span);
    letterSpans.push(span);
  }

  // Smoke particle class (same as before, slightly smoother)
  class SmokeParticle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = Math.random() * 6 + 4;
      this.alpha = 1;
      this.speedX = (Math.random() - 0.5) * 1.6;
      this.speedY = -Math.random() * 1.2 - 0.2;
      this.growth = 0.25 + Math.random() * 0.3;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.radius += this.growth;
      this.alpha -= 0.02;
    }
    draw(ctx) {
      // radial soft particle
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
      const a = Math.max(0, this.alpha);
      g.addColorStop(0, `rgba(255,255,255,${a * 0.6})`);
      g.addColorStop(1, `rgba(255,255,255,0)`);
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Combined draw loop (lightning + smoke)
  function animateFrame() {
    // clear entire canvas (ctx is already scaled to CSS pixels)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw lightning only while active
    if (lightningActive && lightningSegments.length > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // outer glow
      ctx.beginPath();
      ctx.moveTo(window.innerWidth + 60, -60);
      for (let p of lightningSegments) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = 'rgba(80,220,255,0.08)';
      ctx.lineWidth = 28;
      ctx.stroke();

      // middle glow
      ctx.beginPath();
      ctx.moveTo(window.innerWidth + 60, -60);
      for (let p of lightningSegments) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = 'rgba(80,220,255,0.15)';
      ctx.lineWidth = 10;
      ctx.stroke();

      // bright core
      ctx.beginPath();
      ctx.moveTo(window.innerWidth + 60, -60);
      for (let p of lightningSegments) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = 'rgba(255,255,255,1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }

    // draw smoke (iterate backwards to remove safely)
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
      const s = smokeParticles[i];
      s.update();
      s.draw(ctx);
      if (s.alpha <= 0) smokeParticles.splice(i, 1);
    }

    // stop loop when everything finished
    if (!lightningActive && smokeParticles.length === 0) {
      animationRunning = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    requestAnimationFrame(animateFrame);
    animationRunning = true;
  }

  // The main logic: bolt traces to each letter sequentially
  function runLightningWrite() {
    // start off-screen top-right in CSS pixels
    const startX = window.innerWidth + 60;
    const startY = -60;
    let currentX = startX;
    let currentY = startY;
    let idx = 0;

    // reveal letters one-by-one; we re-read bounding rects right before each target
    function revealNextLetter() {
      if (idx >= letterSpans.length) {
        // finished: stop lightning and spawn smoke at final letter center
        lightningActive = false;
        const lastRect = letterSpans[letterSpans.length - 1].getBoundingClientRect();
        const cx = lastRect.left + lastRect.width / 2;
        const cy = lastRect.top + lastRect.height / 2;
        for (let i = 0; i < SMOKE_COUNT; i++) smokeParticles.push(new SmokeParticle(cx, cy));
        if (!animationRunning) requestAnimationFrame(animateFrame);
        return;
      }

      // re-query target rect (important for mobile viewport changes)
      const span = letterSpans[idx];
      const r = span.getBoundingClientRect();
      const targetX = r.left + r.width / 2;
      const targetY = r.top + r.height / 2;

      // reveal letter with flicker
      span.style.opacity = 1;
      let flick = 0;
      const flicker = setInterval(() => {
        span.style.textShadow = `0 0 ${Math.random() * 6 + 2}px #0ff, 0 0 ${Math.random() * 10 + 5}px #0ff`;
        flick++;
        if (flick > 2) {
          clearInterval(flicker);
          span.style.textShadow = '0 0 2px #fff, 0 0 6px #0ff, 0 0 10px #0ff';
        }
      }, 30);

      // animate bolt tip from current -> target
      const steps = 10; // more steps = smoother on mobile
      let step = 0;

      function stepAnim() {
        if (!lightningActive) return;
        if (step > steps) {
          currentX = targetX;
          currentY = targetY;
          idx++;
          setTimeout(revealNextLetter, 5);
          return;
        }

        const t = step / steps;
        const x = currentX + (targetX - currentX) * t + (Math.random() - 0.5) * 6;
        const y = currentY + (targetY - currentY) * t + (Math.random() - 0.5) * 6;

        // store segment (these are CSS-pixel coords; ctx is scaled to CSS pixels)
        if (lightningActive) {
          lightningSegments.push({ x, y });
          if (lightningSegments.length > SEGMENT_COUNT) lightningSegments.shift();
        }

        step++;
        if (!animationRunning) requestAnimationFrame(animateFrame);
        requestAnimationFrame(stepAnim);
      }

      // small guard: if bounding rect has 0 width/height (hidden/flow), recompute after a short delay
      if (r.width === 0 && r.height === 0) {
        // likely not laid out yet — try again soon
        setTimeout(revealNextLetter, 60);
        return;
      }

      stepAnim();
    }

    revealNextLetter();
  }

  // Kick off after load + slight delay so your hero reveal animation finishes
  window.addEventListener('load', () => {
    setTimeout(() => {
      // force update canvas sizing & reset segments
      resizeCanvas();
      lightningSegments = [];
      runLightningWrite();
      if (!animationRunning) requestAnimationFrame(animateFrame);
    }, START_DELAY + 300);
  });
})();

