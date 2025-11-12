(() => {
  // config
  const START_DELAY = 900; // ms after window load to start (lets your hero reveal run)
  const LETTER_STEP_MS = 120; // delay between letters being written
  const SEGMENT_COUNT = 20; // number of stored segments for trailing bolt
  const SMOKE_COUNT = 30; // particles at end

  // DOM checks
  const heroTitle = document.getElementById('heroTitle');
  const heroName = document.getElementById('heroName');
  if (!heroTitle || !heroName) return; // only run on pages with those elements

  // Create / hook canvas
  const canvas = document.getElementById('lightning-canvas') || (() => {
    const c = document.createElement('canvas');
    c.id = 'lightning-canvas';
    document.body.appendChild(c);
    return c;
  })();
  const ctx = canvas.getContext('2d');

  // responsive canvas
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Replace heroTitle text with spans for each character
  const originalTitle = heroTitle.textContent.trim() || "Software Engineer";
  heroTitle.textContent = ''; // clear
  heroTitle.style.whiteSpace = 'nowrap'; // keep on one line
  const letterSpans = [];
  for (const ch of originalTitle) {
    const span = document.createElement('span');
    span.className = 'software-letter';
    span.textContent = ch;
    heroTitle.appendChild(span);
    letterSpans.push(span);
  }

  // Smoke particle class
  class SmokeParticle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = Math.random() * 6 + 4;
      this.alpha = 1;
      this.speedX = (Math.random() - 0.5) * 1.6;
      this.speedY = -Math.random() * 1.2 - 0.2;
      this.growth = 0.25 + Math.random() * 0.3;
      this.rotation = (Math.random() - 0.5) * 0.4;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.radius += this.growth;
      this.alpha -= 0.02;
    }
    draw(ctx) {
      ctx.save();
      ctx.beginPath();
      ctx.globalAlpha = Math.max(0, this.alpha);
      // radial-ish soft circle using arc and globalAlpha
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
      const alpha = Math.max(0, this.alpha);
      g.addColorStop(0, `rgba(255,255,255,${alpha * 0.6})`);
      g.addColorStop(1, `rgba(255,255,255,${alpha * 0})`);
      ctx.fillStyle = g;
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // state
  let smokeParticles = [];
  let lightningSegments = []; // {x,y} trailing points
  let lightningActive = true;
  let animationRunning = false;

  // main frame draw (draws both lightning and smoke)
  function animateFrame() {
    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw lightning only while active
    if (lightningActive && lightningSegments.length > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // glow layer (blur)
      ctx.beginPath();
      ctx.moveTo(canvas.width + 60, -60);
      for (let p of lightningSegments) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = 'rgba(80,220,255,0.08)';
      ctx.lineWidth = 28;
      ctx.stroke();

      // middle glow
      ctx.beginPath();
      ctx.moveTo(canvas.width + 60, -60);
      for (let p of lightningSegments) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = 'rgba(80,220,255,0.15)';
      ctx.lineWidth = 10;
      ctx.stroke();

      // bright core
      ctx.beginPath();
      ctx.moveTo(canvas.width + 60, -60);
      for (let p of lightningSegments) ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = 'rgba(255,255,255,1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();
    }

    // draw smoke (iterate backwards to safely splice)
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
      const s = smokeParticles[i];
      s.update();
      s.draw(ctx);
      if (s.alpha <= 0) smokeParticles.splice(i, 1);
    }

    // stop animation loop if nothing to do
    if (!lightningActive && smokeParticles.length === 0) {
      animationRunning = false;
      // final clear to ensure no residue
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    requestAnimationFrame(animateFrame);
    animationRunning = true;
  }

  // animate lightning traveling to each letter, revealing them
  function runLightningWrite() {
    const startX = canvas.width + 60;
    const startY = -60;
    let currentX = startX;
    let currentY = startY;
    let idx = 0;

    function revealNextLetter() {
      if (idx >= letterSpans.length) {
        // finished: spawn smoke at final letter center
        lightningActive = false; // stop drawing lightning
        const lastRect = letterSpans[letterSpans.length - 1].getBoundingClientRect();
        const cx = lastRect.left + lastRect.width / 2;
        const cy = lastRect.top + lastRect.height / 2;
        for (let i = 0; i < SMOKE_COUNT; i++) {
          smokeParticles.push(new SmokeParticle(cx, cy));
        }
        if (!animationRunning) requestAnimationFrame(animateFrame);
        return;
      }

      const span = letterSpans[idx];
      const r = span.getBoundingClientRect();
      const targetX = r.left + r.width / 2;
      const targetY = r.top + r.height / 2;

      // reveal letter with electric flicker
      span.style.opacity = 1;
      let flick = 0;
      const flicker = setInterval(() => {
        span.style.textShadow = `0 0 ${Math.random() * 6 + 2}px #0ff, 0 0 ${Math.random() * 10 + 5}px #0ff`;
        flick++;
        if (flick > 4) {
          clearInterval(flicker);
          span.style.textShadow = '0 0 2px #fff, 0 0 6px #0ff, 0 0 10px #0ff';
        }
      }, 60);

      // animate bolt tip from current -> target with many tiny steps
      const steps = 22;
      let step = 0;
      function stepAnim() {
        if (!lightningActive) return; // bail if stopped externally
        if (step > steps) {
          // commit the tip to current for next letter
          currentX = targetX;
          currentY = targetY;
          idx++;
          // slight delay between letters to let flicker show
          setTimeout(revealNextLetter, 80);
          return;
        }

        // compute interpolated point with small jitter for jagged appearance
        const t = step / steps;
        const x = currentX + (targetX - currentX) * t + (Math.random() - 0.5) * 6;
        const y = currentY + (targetY - currentY) * t + (Math.random() - 0.5) * 6;

        // push point to segments
        if (lightningActive) {
          lightningSegments.push({ x, y });
          if (lightningSegments.length > SEGMENT_COUNT) lightningSegments.shift();
        }

        step++;
        // ensure frame loop runs
        if (!animationRunning) requestAnimationFrame(animateFrame);
        requestAnimationFrame(stepAnim);
      }
      stepAnim();
    }

    revealNextLetter();
  }

  // Kick off after load and small delay so your hero intro finishes first
  window.addEventListener('load', () => {
    setTimeout(() => {
      // ensure letter positions are accurate (reflow), then start
      runLightningWrite();
      if (!animationRunning) requestAnimationFrame(animateFrame);
    }, START_DELAY + 300); // a little extra so your site reveal finishes
  });

})();
