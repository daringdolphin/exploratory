import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_SPEC_FIELDS = [
  "id",
  "source_ref",
  "subject",
  "topic",
  "medium",
  "mechanism",
  "transferable_principle",
  "steps",
  "key_symbols",
  "interactivity_hooks",
  "output_filename",
];

const ROLE_COLORS = {
  problem: "#c0392b",
  agent: "#1f6fa6",
  resolution: "#5dade2",
  neutral: "#1a1a1a",
  highlight: "#f1c40f",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function validateSpec(spec, index) {
  const prefix = `artifact ${index + 1}${spec?.id ? ` (${spec.id})` : ""}`;
  const errors = [];

  for (const field of REQUIRED_SPEC_FIELDS) {
    if (!(field in spec)) {
      errors.push(`${prefix}: missing ${field}`);
    }
  }

  if (spec.medium !== "interactive_html") {
    errors.push(`${prefix}: medium must be interactive_html`);
  }

  if (!Array.isArray(spec.steps) || spec.steps.length < 2 || spec.steps.length > 5) {
    errors.push(`${prefix}: steps must contain 2-5 beats`);
  }

  if (!Array.isArray(spec.key_symbols) || spec.key_symbols.length === 0) {
    errors.push(`${prefix}: key_symbols must be a non-empty array`);
  }

  for (const symbol of spec.key_symbols || []) {
    if (!ROLE_COLORS[symbol.role]) {
      errors.push(`${prefix}: unknown role '${symbol.role}' on symbol '${symbol.symbol}'`);
    }
  }

  if (!String(spec.output_filename || "").endsWith(".html")) {
    errors.push(`${prefix}: output_filename must end in .html`);
  }

  return errors;
}

function isRateFactorExplorer(spec) {
  const searchable = `${spec.id} ${spec.topic} ${spec.mechanism} ${spec.transferable_principle} ${spec.interactivity_hooks.join(" ")}`;

  if (
    /^rate-reaction-/i.test(spec.id) &&
    /particle size|surface area|concentration|pressure|temperature|catalyst|activation energy|factor explorer/i.test(searchable) &&
    !/effective collision|gas volume gradient|mass loss gradient|graph choice/i.test(searchable)
  ) {
    return true;
  }

  return (
    /rate.*factor|factor.*rate|effective collision/i.test(`${spec.id} ${spec.topic} ${spec.mechanism}`) &&
    /concentration|pressure|temperature|catalyst|particle size/i.test(spec.interactivity_hooks.join(" "))
  );
}

function animatedRateFactorHtml(spec, notes) {
  const data = JSON.stringify({ spec, notes }).replaceAll("</script", "<\\/script");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(notes.title)} - ${escapeHtml(spec.topic)}</title>
  <style>
    :root {
      --problem: #c0392b;
      --agent: #1f6fa6;
      --resolution: #5dade2;
      --neutral: #1a1a1a;
      --highlight: #f1c40f;
      --good: #1e7d4f;
      --bg: #f5f1e8;
      --paper: #fbf8f1;
      --rule: #d8d2c2;
      --ink-soft: #4a4a4a;
    }

    * { box-sizing: border-box; }

    html, body {
      min-height: 100%;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--neutral);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .shell {
      width: min(1180px, calc(100vw - 28px));
      margin: 0 auto;
      padding: 24px 0 28px;
    }

    header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: end;
      border-bottom: 1px solid var(--rule);
      padding-bottom: 16px;
      margin-bottom: 18px;
    }

    .eyebrow, .source, .counter, button, .metric, .step-btn, .field span, .pill {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      letter-spacing: 0;
    }

    .eyebrow {
      color: var(--agent);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    h1 {
      margin: 4px 0 8px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(34px, 5vw, 62px);
      line-height: 0.94;
      letter-spacing: 0;
    }

    .lede {
      margin: 0;
      max-width: 780px;
      color: var(--ink-soft);
      font-size: 17px;
      line-height: 1.42;
    }

    .source {
      color: var(--ink-soft);
      font-size: 12px;
      text-align: right;
      white-space: nowrap;
    }

    .lesson {
      display: grid;
      grid-template-columns: minmax(0, 7fr) minmax(294px, 3fr);
      gap: 20px;
      align-items: start;
    }

    .stage, aside, .panel, .caption {
      background: var(--paper);
      border: 1px solid var(--rule);
    }

    .stage {
      min-height: 690px;
      display: grid;
      grid-template-rows: auto minmax(430px, 1fr) auto auto;
    }

    .stage-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 18px 0;
    }

    .counter {
      color: var(--ink-soft);
      font-size: 12px;
    }

    .stage-title {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
      text-align: right;
    }

    .animation-wrap {
      position: relative;
      min-height: 430px;
      margin: 10px 18px 0;
      background: #fffdf8;
      border: 1px solid var(--rule);
      overflow: hidden;
    }

    canvas {
      width: 100%;
      height: 100%;
      min-height: 430px;
      display: block;
    }

    .metric-row {
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: 12px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      pointer-events: none;
    }

    .metric {
      min-height: 48px;
      padding: 8px 10px;
      background: rgba(251, 248, 241, 0.92);
      border: 1px solid var(--rule);
      font-size: 12px;
    }

    .metric strong {
      display: block;
      margin-bottom: 3px;
      color: var(--neutral);
      font-size: 15px;
    }

    .caption {
      margin: 14px 18px;
      padding: 14px 16px;
      border-left: 8px solid var(--problem);
    }

    .caption strong {
      display: block;
      margin-bottom: 4px;
      font-size: 15px;
    }

    .caption p {
      margin: 0;
      color: var(--ink-soft);
      line-height: 1.43;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0 18px 18px;
    }

    button {
      min-height: 38px;
      border: 1px solid var(--neutral);
      background: var(--paper);
      color: var(--neutral);
      padding: 0 12px;
      font-size: 12px;
      cursor: pointer;
    }

    button:hover, button[aria-current="true"] {
      background: var(--neutral);
      color: var(--paper);
    }

    aside {
      padding: 16px;
    }

    .steps-list {
      display: grid;
      gap: 8px;
      margin-bottom: 16px;
    }

    .step-btn {
      width: 100%;
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      text-align: left;
      min-height: 50px;
      padding: 10px;
    }

    .panel {
      padding: 14px;
      margin-top: 12px;
    }

    .panel h2 {
      margin: 0 0 10px;
      font-size: 13px;
      text-transform: uppercase;
    }

    .panel p {
      margin: 0;
      color: var(--ink-soft);
      line-height: 1.43;
    }

    .fields {
      display: grid;
      gap: 12px;
    }

    .field {
      display: grid;
      gap: 6px;
      color: var(--ink-soft);
      font-size: 13px;
    }

    .field span {
      color: var(--neutral);
      font-size: 12px;
      font-weight: 800;
    }

    input[type="range"] {
      width: 100%;
      accent-color: var(--agent);
    }

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--rule);
      background: #fffdf8;
      padding: 5px 7px;
      font-size: 11px;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: currentColor;
    }

    footer {
      border-top: 1px solid var(--rule);
      margin-top: 18px;
      padding-top: 12px;
      color: var(--ink-soft);
      font-size: 13px;
    }

    @media (max-width: 860px) {
      header, .lesson {
        grid-template-columns: 1fr;
      }

      .source {
        text-align: left;
      }

      .metric-row {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div>
        <div class="eyebrow">${escapeHtml(spec.subject)} / ${escapeHtml(spec.source_ref)}</div>
        <h1>${escapeHtml(spec.topic)}</h1>
        <p class="lede">${escapeHtml(spec.mechanism)}</p>
      </div>
      <div class="source">${escapeHtml(notes.id)}<br />animated mini-lesson</div>
    </header>

    <main class="lesson">
      <section class="stage" aria-label="Animated mini-lesson">
        <div class="stage-top">
          <div class="counter" id="counter"></div>
          <p class="stage-title" id="stageTitle"></p>
        </div>

        <div class="animation-wrap">
          <canvas id="lessonCanvas" aria-label="Animated particle and activation energy lesson"></canvas>
          <div class="metric-row" aria-live="polite">
            <div class="metric"><strong id="rateMetric">0%</strong> predicted rate</div>
            <div class="metric"><strong id="collisionMetric">0x</strong> collision frequency</div>
            <div class="metric"><strong id="energyMetric">0%</strong> enough energy</div>
          </div>
        </div>

        <div class="caption" id="caption">
          <strong id="captionName"></strong>
          <p id="captionBeat"></p>
        </div>

        <div class="controls">
          <button type="button" id="back">Back</button>
          <button type="button" id="next">Next</button>
          <button type="button" id="restart">Restart</button>
          <button type="button" id="auto">Auto</button>
          <button type="button" id="motion">Pause motion</button>
        </div>
      </section>

      <aside>
        <div class="steps-list" id="stepsList"></div>

        <div class="panel">
          <h2>Explore</h2>
          <div class="fields">
            <label class="field"><span>Particle size</span><input type="range" min="1" max="5" step="1" value="4" data-factor="size" /></label>
            <label class="field"><span>Concentration</span><input type="range" min="1" max="5" step="1" value="2" data-factor="concentration" /></label>
            <label class="field"><span>Pressure</span><input type="range" min="1" max="5" step="1" value="2" data-factor="pressure" /></label>
            <label class="field"><span>Temperature</span><input type="range" min="20" max="90" step="10" value="40" data-factor="temperature" /></label>
            <button type="button" id="catalystToggle">Catalyst off</button>
          </div>
        </div>

        <div class="panel">
          <h2>Principle</h2>
          <p>${escapeHtml(spec.transferable_principle)}</p>
          <div class="pill-row">
            <span class="pill" style="color: var(--problem)"><span class="dot"></span>problem</span>
            <span class="pill" style="color: var(--agent)"><span class="dot"></span>agent</span>
            <span class="pill" style="color: var(--highlight)"><span class="dot"></span>focus</span>
            <span class="pill" style="color: var(--good)"><span class="dot"></span>rate</span>
          </div>
        </div>
      </aside>
    </main>

    <footer>Self-contained HTML for sandboxed iframe rendering: no external scripts, no remote assets, and no parent-page access. Use Left/Right, Space for auto-play, and R to restart.</footer>
  </div>

  <script>
    const DATA = ${data};
    const spec = DATA.spec;
    const colors = {
      problem: "#c0392b",
      agent: "#1f6fa6",
      resolution: "#5dade2",
      neutral: "#1a1a1a",
      highlight: "#f1c40f",
      good: "#1e7d4f",
      paper: "#fbf8f1",
      rule: "#d8d2c2",
      inkSoft: "#4a4a4a"
    };

    const presets = [
      { size: 4, concentration: 2, pressure: 2, temperature: 40, catalyst: false },
      { size: 2, concentration: 4, pressure: 4, temperature: 40, catalyst: false },
      { size: 4, concentration: 2, pressure: 2, temperature: 80, catalyst: false },
      { size: 4, concentration: 2, pressure: 2, temperature: 40, catalyst: true },
      { size: 2, concentration: 4, pressure: 4, temperature: 80, catalyst: true }
    ];

    let state = { ...presets[0] };
    let stepIndex = 0;
    let autoTimer = null;
    let motionRunning = true;
    let lastTime = 0;
    let frameCount = 0;
    const particles = [];
    const pulses = [];

    const canvas = document.querySelector("#lessonCanvas");
    const ctx = canvas.getContext("2d");
    const counter = document.querySelector("#counter");
    const stageTitle = document.querySelector("#stageTitle");
    const caption = document.querySelector("#caption");
    const captionName = document.querySelector("#captionName");
    const captionBeat = document.querySelector("#captionBeat");
    const rateMetric = document.querySelector("#rateMetric");
    const collisionMetric = document.querySelector("#collisionMetric");
    const energyMetric = document.querySelector("#energyMetric");
    const catalystToggle = document.querySelector("#catalystToggle");
    const motionButton = document.querySelector("#motion");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      motionRunning = false;
      motionButton.textContent = "Resume motion";
      motionButton.setAttribute("aria-current", "true");
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function rand(min, max) {
      return min + Math.random() * (max - min);
    }

    function metrics() {
      const surfaceArea = (6 - state.size) / 3;
      const crowding = state.concentration / 2.2;
      const compression = state.pressure / 2.4;
      const motion = 0.7 + (state.temperature - 20) / 75;
      const threshold = state.catalyst ? 0.34 : 0.62;
      const energyFraction = clamp((motion - threshold + 0.35) / 1.05, 0.12, 0.95);
      const collisionFrequency = surfaceArea * crowding * compression * motion;
      const rate = clamp((collisionFrequency * energyFraction) / 5, 0.06, 1);
      return { surfaceArea, crowding, compression, motion, energyFraction, collisionFrequency, rate };
    }

    function box() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const baseWidth = Math.min(360, width * 0.42);
      const boxWidth = baseWidth - (state.pressure - 1) * 24;
      return {
        x: Math.max(34, width * 0.055 + (baseWidth - boxWidth) / 2),
        y: Math.max(58, height * 0.18),
        w: boxWidth,
        h: Math.min(284, height * 0.54)
      };
    }

    function particleTargetCount() {
      return Math.round(10 + state.concentration * 5 + state.pressure * 3);
    }

    function particleRadius() {
      return 6 + state.size * 2.5;
    }

    function syncControls() {
      document.querySelectorAll("[data-factor]").forEach(function(input) {
        input.value = String(state[input.dataset.factor]);
      });
      catalystToggle.textContent = state.catalyst ? "Catalyst on" : "Catalyst off";
      catalystToggle.setAttribute("aria-current", state.catalyst ? "true" : "false");
    }

    function applyPreset(index) {
      state = { ...presets[index] };
      syncControls();
      fitParticleCount(true);
      renderText();
    }

    function fitParticleCount(resetVelocity) {
      const b = box();
      const target = particleTargetCount();
      const radius = particleRadius();

      while (particles.length < target) {
        particles.push({
          x: rand(b.x + radius, b.x + b.w - radius),
          y: rand(b.y + radius, b.y + b.h - radius),
          vx: rand(-1, 1),
          vy: rand(-1, 1),
          phase: rand(0, Math.PI * 2),
          lastHit: 0
        });
      }

      while (particles.length > target) {
        particles.pop();
      }

      const m = metrics();
      particles.forEach(function(p) {
        p.x = clamp(p.x, b.x + radius, b.x + b.w - radius);
        p.y = clamp(p.y, b.y + radius, b.y + b.h - radius);
        if (resetVelocity || Math.abs(p.vx) + Math.abs(p.vy) < 0.2) {
          const angle = rand(0, Math.PI * 2);
          const speed = 36 + m.motion * 42;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
        }
      });
    }

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fitParticleCount(true);
    }

    function drawText(text, x, y, options) {
      const opts = options || {};
      ctx.save();
      ctx.fillStyle = opts.color || colors.neutral;
      ctx.font = opts.font || "700 13px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = opts.align || "left";
      ctx.textBaseline = opts.baseline || "alphabetic";
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function strokeCurve(points, color, width, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      ctx.bezierCurveTo(points[2], points[3], points[4], points[5], points[6], points[7]);
      ctx.bezierCurveTo(points[8], points[9], points[10], points[11], points[12], points[13]);
      ctx.stroke();
      ctx.restore();
    }

    function drawEnergyDiagram(time, width, height, m) {
      const x = Math.max(width * 0.57, 470);
      const y = Math.max(76, height * 0.17);
      const w = Math.min(330, width - x - 38);
      const h = Math.min(250, height * 0.44);
      const baseline = y + h * 0.78;
      const highPeak = y + h * 0.16;
      const lowPeak = y + h * 0.43;
      const start = x + 26;
      const end = x + w - 28;
      const mid = x + w / 2;
      const pulse = 0.55 + Math.sin(time * 0.004) * 0.25;

      ctx.save();
      ctx.strokeStyle = colors.rule;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      drawText("activation energy barrier", mid, y + 24, { align: "center", color: colors.problem });

      const highCurve = [start, baseline, x + w * 0.28, baseline, x + w * 0.31, highPeak, mid, highPeak, x + w * 0.69, highPeak, x + w * 0.72, baseline, end, baseline];
      const lowCurve = [start, baseline, x + w * 0.28, baseline, x + w * 0.34, lowPeak, mid, lowPeak, x + w * 0.66, lowPeak, x + w * 0.72, baseline, end, baseline];
      strokeCurve(highCurve, colors.problem, stepIndex === 2 ? 7 : 5, state.catalyst ? 0.24 : 1);
      strokeCurve(lowCurve, colors.agent, stepIndex === 3 || state.catalyst ? 6 : 4, state.catalyst ? 1 : 0.22);

      const energyLineY = baseline - m.energyFraction * (baseline - y - 48);
      ctx.strokeStyle = colors.highlight;
      ctx.lineWidth = stepIndex === 2 ? 4 : 2;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(start, energyLineY);
      ctx.lineTo(end, energyLineY);
      ctx.stroke();
      ctx.setLineDash([]);
      drawText("particle energy", end - 2, energyLineY - 8, { align: "right", color: colors.highlight });

      if (state.catalyst) {
        ctx.strokeStyle = colors.highlight;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(mid, highPeak + 14);
        ctx.lineTo(mid, lowPeak - 12);
        ctx.stroke();
        drawText("lower path", mid, lowPeak + 24, { align: "center", color: colors.agent });
      }

      const dotCount = 14;
      for (let i = 0; i < dotCount; i += 1) {
        const dotX = x + 34 + i * ((w - 68) / (dotCount - 1));
        const lift = Math.sin(time * 0.004 + i * 0.8) * 18 * m.motion;
        const dotY = baseline - 20 - (i / dotCount) * 96 * m.energyFraction + lift;
        const above = dotY < (state.catalyst ? lowPeak + 12 : highPeak + 12);
        ctx.fillStyle = above ? colors.good : colors.inkSoft;
        ctx.globalAlpha = above ? 0.9 : 0.35;
        ctx.beginPath();
        ctx.arc(dotX, dotY, above ? 5 : 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawParticles(delta, time, width, height, m) {
      const b = box();
      const radius = particleRadius();
      const contactActive = stepIndex === 1 || stepIndex === 4;

      ctx.save();
      ctx.fillStyle = "#fffdf8";
      ctx.strokeStyle = contactActive ? colors.highlight : colors.neutral;
      ctx.lineWidth = contactActive ? 6 : 3;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      drawText(contactActive ? "more contact chances" : "reacting particles", b.x + b.w / 2, b.y - 14, {
        align: "center",
        color: contactActive ? colors.agent : colors.neutral
      });

      if (contactActive) {
        ctx.fillStyle = "rgba(31, 111, 166, 0.08)";
        ctx.fillRect(b.x + 12, b.y + b.h + 16, b.w - 24, 38);
        ctx.strokeStyle = colors.agent;
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x + 12, b.y + b.h + 16, b.w - 24, 38);
        drawText("smaller pieces + more particles per volume", b.x + b.w / 2, b.y + b.h + 41, {
          align: "center",
          color: colors.agent
        });
      }

      particles.forEach(function(p) {
        if (motionRunning) {
          p.x += p.vx * delta * m.motion;
          p.y += p.vy * delta * m.motion;
        }

        if (p.x < b.x + radius || p.x > b.x + b.w - radius) {
          p.vx *= -1;
          p.x = clamp(p.x, b.x + radius, b.x + b.w - radius);
        }
        if (p.y < b.y + radius || p.y > b.y + b.h - radius) {
          p.vy *= -1;
          p.y = clamp(p.y, b.y + radius, b.y + b.h - radius);
        }
      });

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const bParticle = particles[j];
          const dx = bParticle.x - a.x;
          const dy = bParticle.y - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 0 && dist < radius * 2.05) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = radius * 2.05 - dist;
            a.x -= nx * overlap * 0.5;
            a.y -= ny * overlap * 0.5;
            bParticle.x += nx * overlap * 0.5;
            bParticle.y += ny * overlap * 0.5;
            const avx = a.vx;
            const avy = a.vy;
            a.vx = bParticle.vx;
            a.vy = bParticle.vy;
            bParticle.vx = avx;
            bParticle.vy = avy;
            if (time - a.lastHit > 180 && time - bParticle.lastHit > 180 && pulses.length < 18) {
              const effective = Math.random() < m.energyFraction;
              pulses.push({ x: (a.x + bParticle.x) / 2, y: (a.y + bParticle.y) / 2, age: 0, effective });
              a.lastHit = time;
              bParticle.lastHit = time;
            }
          }
        }
      }

      particles.forEach(function(p, index) {
        const energy = (Math.sin(time * 0.003 + p.phase) + 1) / 2;
        const energetic = energy < m.energyFraction;
        ctx.fillStyle = energetic ? colors.agent : "#fffdf8";
        ctx.strokeStyle = energetic ? colors.agent : colors.problem;
        ctx.lineWidth = energetic ? 4 : 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = colors.highlight;
        ctx.globalAlpha = stepIndex === 2 ? 0.7 : 0.38;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 0.18, p.y + p.vy * 0.18);
        ctx.stroke();
        ctx.globalAlpha = 1;

        if (index % 5 === 0 && contactActive) {
          ctx.strokeStyle = colors.agent;
          ctx.globalAlpha = 0.28;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius + 7, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });

      for (let i = pulses.length - 1; i >= 0; i -= 1) {
        const pulse = pulses[i];
        pulse.age += delta;
        const alpha = 1 - pulse.age / 0.55;
        if (alpha <= 0) {
          pulses.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = pulse.effective ? colors.good : colors.highlight;
        ctx.lineWidth = pulse.effective ? 4 : 2;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, 8 + pulse.age * 62, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    function draw(time) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const delta = Math.min(0.04, Math.max(0.001, (time - lastTime) / 1000 || 0.016));
      lastTime = time;
      frameCount += 1;
      window.__lessonState = { stepIndex, frameCount, state: { ...state }, metrics: metrics() };

      const m = metrics();
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#fffdf8";
      ctx.fillRect(0, 0, width, height);
      drawParticles(delta, time, width, height, m);
      drawEnergyDiagram(time, width, height, m);

      rateMetric.textContent = Math.round(m.rate * 100) + "%";
      collisionMetric.textContent = m.collisionFrequency.toFixed(1) + "x";
      energyMetric.textContent = Math.round(m.energyFraction * 100) + "%";

      requestAnimationFrame(draw);
    }

    function renderSteps() {
      const stepsList = document.querySelector("#stepsList");
      stepsList.replaceChildren();
      spec.steps.forEach(function(step, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "step-btn";
        button.setAttribute("aria-current", index === stepIndex ? "true" : "false");
        button.innerHTML = "<span>" + String(index + 1).padStart(2, "0") + "</span><strong></strong>";
        button.querySelector("strong").textContent = step.name;
        button.addEventListener("click", function() {
          stopAuto();
          stepIndex = index;
          applyPreset(stepIndex);
        });
        stepsList.append(button);
      });
    }

    function renderText() {
      const step = spec.steps[stepIndex];
      counter.textContent = String(stepIndex + 1).padStart(2, "0") + " / " + String(spec.steps.length).padStart(2, "0");
      stageTitle.textContent = step.name;
      captionName.textContent = step.name;
      captionBeat.textContent = step.beat;
      caption.style.borderLeftColor = stepIndex === 0 ? colors.problem : stepIndex === spec.steps.length - 1 ? colors.good : colors.agent;
      renderSteps();
    }

    function nextStep() {
      stepIndex = (stepIndex + 1) % spec.steps.length;
      applyPreset(stepIndex);
    }

    function previousStep() {
      stepIndex = (stepIndex - 1 + spec.steps.length) % spec.steps.length;
      applyPreset(stepIndex);
    }

    function stopAuto() {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
        document.querySelector("#auto").setAttribute("aria-current", "false");
      }
    }

    document.querySelector("#back").addEventListener("click", function() { stopAuto(); previousStep(); });
    document.querySelector("#next").addEventListener("click", function() { stopAuto(); nextStep(); });
    document.querySelector("#restart").addEventListener("click", function() {
      stopAuto();
      stepIndex = 0;
      applyPreset(0);
    });
    document.querySelector("#auto").addEventListener("click", function() {
      if (autoTimer) {
        stopAuto();
      } else {
        this.setAttribute("aria-current", "true");
        autoTimer = setInterval(nextStep, 2600);
      }
    });
    motionButton.addEventListener("click", function() {
      motionRunning = !motionRunning;
      motionButton.textContent = motionRunning ? "Pause motion" : "Resume motion";
      motionButton.setAttribute("aria-current", motionRunning ? "false" : "true");
    });
    catalystToggle.addEventListener("click", function() {
      state.catalyst = !state.catalyst;
      syncControls();
      renderText();
    });
    document.querySelectorAll("[data-factor]").forEach(function(input) {
      input.addEventListener("input", function() {
        state[input.dataset.factor] = Number(input.value);
        fitParticleCount(true);
        renderText();
      });
    });
    window.addEventListener("resize", resizeCanvas);
    document.addEventListener("visibilitychange", function() {
      if (document.hidden) {
        motionRunning = false;
        motionButton.textContent = "Resume motion";
        motionButton.setAttribute("aria-current", "true");
        stopAuto();
      }
    });
    window.addEventListener("keydown", function(event) {
      if (event.key === "ArrowRight") { stopAuto(); nextStep(); }
      if (event.key === "ArrowLeft") { stopAuto(); previousStep(); }
      if (event.key.toLowerCase() === "r") { stopAuto(); stepIndex = 0; applyPreset(0); }
      if (event.code === "Space") {
        event.preventDefault();
        document.querySelector("#auto").click();
      }
    });

    resizeCanvas();
    applyPreset(0);
    if (!document.hidden) {
      requestAnimationFrame(draw);
    }
  </script>
</body>
</html>
`;
}

function animatedCanvasSpecHtml(spec, notes) {
  const data = JSON.stringify({ spec, notes }).replaceAll("</script", "<\\/script");
  const hookButtons = spec.interactivity_hooks.length
    ? spec.interactivity_hooks
        .map(
          (hook, index) =>
            `<button class="hook-btn" type="button" data-hook="${index}">${escapeHtml(hook)}</button>`,
        )
        .join("")
    : `<p class="quiet">This artifact is paced as a cause-and-effect walkthrough.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(notes.title)} - ${escapeHtml(spec.topic)}</title>
  <style>
    :root {
      --problem: #c0392b;
      --agent: #1f6fa6;
      --resolution: #5dade2;
      --neutral: #1a1a1a;
      --highlight: #f1c40f;
      --good: #1e7d4f;
      --bg: #f5f1e8;
      --paper: #fbf8f1;
      --rule: #d8d2c2;
      --ink-soft: #4a4a4a;
    }

    * { box-sizing: border-box; }

    html, body {
      min-height: 100%;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--neutral);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .shell {
      width: min(1180px, calc(100vw - 28px));
      margin: 0 auto;
      padding: 24px 0 28px;
    }

    header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: end;
      border-bottom: 1px solid var(--rule);
      padding-bottom: 16px;
      margin-bottom: 18px;
    }

    .eyebrow, .source, .counter, button, .step-btn, .metric, .pill {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      letter-spacing: 0;
    }

    .eyebrow {
      color: var(--agent);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    h1 {
      margin: 4px 0 8px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(34px, 5vw, 60px);
      line-height: 0.94;
      letter-spacing: 0;
    }

    .lede {
      margin: 0;
      max-width: 780px;
      color: var(--ink-soft);
      font-size: 17px;
      line-height: 1.42;
    }

    .source {
      color: var(--ink-soft);
      font-size: 12px;
      text-align: right;
      white-space: nowrap;
    }

    .lesson {
      display: grid;
      grid-template-columns: minmax(0, 7fr) minmax(294px, 3fr);
      gap: 20px;
      align-items: start;
    }

    .stage, aside, .panel, .caption {
      background: var(--paper);
      border: 1px solid var(--rule);
    }

    .stage {
      min-height: 680px;
      display: grid;
      grid-template-rows: auto minmax(430px, 1fr) auto auto;
    }

    .stage-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 18px 0;
    }

    .counter {
      color: var(--ink-soft);
      font-size: 12px;
    }

    .stage-title {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
      text-align: right;
    }

    .animation-wrap {
      position: relative;
      min-height: 430px;
      margin: 10px 18px 0;
      background: #fffdf8;
      border: 1px solid var(--rule);
      overflow: hidden;
    }

    canvas {
      width: 100%;
      height: 100%;
      min-height: 430px;
      display: block;
    }

    .metric-row {
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: 12px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      pointer-events: none;
    }

    .metric {
      min-height: 48px;
      padding: 8px 10px;
      background: rgba(251, 248, 241, 0.92);
      border: 1px solid var(--rule);
      font-size: 12px;
    }

    .metric strong {
      display: block;
      margin-bottom: 3px;
      color: var(--neutral);
    }

    .caption {
      margin: 14px 18px;
      padding: 14px 16px;
      border-left: 8px solid var(--highlight);
    }

    .caption strong {
      display: block;
      margin-bottom: 4px;
      font-size: 15px;
    }

    .caption p {
      margin: 0;
      color: var(--ink-soft);
      line-height: 1.45;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0 18px 18px;
    }

    button {
      border: 1px solid var(--neutral);
      background: var(--paper);
      color: var(--neutral);
      min-height: 38px;
      padding: 0 12px;
      font-size: 12px;
      cursor: pointer;
    }

    button:hover, button[aria-current="true"] {
      background: var(--neutral);
      color: var(--paper);
    }

    aside {
      padding: 16px;
    }

    .steps-list {
      display: grid;
      gap: 8px;
      margin-bottom: 16px;
    }

    .step-btn {
      width: 100%;
      text-align: left;
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      padding: 10px;
      min-height: 50px;
    }

    .panel {
      padding: 14px;
      margin-top: 12px;
    }

    .panel h2 {
      margin: 0 0 8px;
      font-size: 13px;
      text-transform: uppercase;
    }

    .panel p {
      margin: 0;
      color: var(--ink-soft);
      line-height: 1.45;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--rule);
      padding: 5px 7px;
      font-size: 11px;
      background: #fffdf8;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: currentColor;
    }

    .hooks {
      display: grid;
      gap: 8px;
    }

    .hook-btn {
      text-align: left;
      min-height: 42px;
      white-space: normal;
      line-height: 1.25;
    }

    .quiet {
      color: var(--ink-soft);
      font-size: 14px;
    }

    footer {
      color: var(--ink-soft);
      border-top: 1px solid var(--rule);
      margin-top: 20px;
      padding-top: 14px;
      font-size: 13px;
    }

    @media (max-width: 820px) {
      header, .lesson {
        grid-template-columns: 1fr;
      }

      .source {
        text-align: left;
      }

      .stage {
        min-height: 560px;
      }

      .metric-row {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div>
        <div class="eyebrow">${escapeHtml(spec.subject)} / ${escapeHtml(spec.source_ref)}</div>
        <h1>${escapeHtml(spec.topic)}</h1>
        <p class="lede">${escapeHtml(spec.mechanism)}</p>
      </div>
      <div class="source">${escapeHtml(notes.id)}<br />canvas mini-lesson</div>
    </header>

    <main class="lesson">
      <section class="stage" aria-label="Animated artifact stage">
        <div class="stage-top">
          <div class="counter" id="counter"></div>
          <p class="stage-title" id="stageTitle"></p>
        </div>
        <div class="animation-wrap">
          <canvas id="scene" role="img" aria-label="${escapeHtml(spec.topic)} animation"></canvas>
          <div class="metric-row">
            <div class="metric"><strong id="metricOne">Mechanism</strong><span id="metricOneValue">ready</span></div>
            <div class="metric"><strong id="metricTwo">Motion</strong><span id="metricTwoValue">paused when hidden</span></div>
            <div class="metric"><strong id="metricThree">Focus</strong><span id="metricThreeValue">step 1</span></div>
          </div>
        </div>
        <div class="caption" id="caption">
          <strong id="captionName"></strong>
          <p id="captionBeat"></p>
        </div>
        <div class="controls">
          <button type="button" id="back">Back</button>
          <button type="button" id="next">Next</button>
          <button type="button" id="restart">Restart</button>
          <button type="button" id="auto">Auto</button>
        </div>
      </section>

      <aside>
        <div class="steps-list" id="stepsList"></div>

        <div class="panel">
          <h2>Principle</h2>
          <p>${escapeHtml(spec.transferable_principle)}</p>
        </div>

        <div class="panel">
          <h2>Explore</h2>
          <div class="hooks">${hookButtons}</div>
          <p class="quiet" id="hookReadout"></p>
        </div>

        <div class="panel">
          <h2>Legend</h2>
          <div class="legend">
            ${Object.entries(ROLE_COLORS)
              .map(
                ([role, color]) =>
                  `<span class="pill" style="color:${color}"><span class="dot"></span>${role}</span>`,
              )
              .join("")}
          </div>
        </div>
      </aside>
    </main>

    <footer>Use Left/Right to move, Space for auto-play, and R to restart.</footer>
  </div>

  <script>
    const DATA = ${data};
    const spec = DATA.spec;
    const colors = {
      problem: "#c0392b",
      agent: "#1f6fa6",
      resolution: "#5dade2",
      neutral: "#1a1a1a",
      highlight: "#f1c40f",
      good: "#1e7d4f",
      paper: "#fbf8f1",
      rule: "#d8d2c2",
      inkSoft: "#4a4a4a"
    };
    const canvas = document.querySelector("#scene");
    const ctx = canvas.getContext("2d");
    const counter = document.querySelector("#counter");
    const stageTitle = document.querySelector("#stageTitle");
    const caption = document.querySelector("#caption");
    const captionName = document.querySelector("#captionName");
    const captionBeat = document.querySelector("#captionBeat");
    const metricOneValue = document.querySelector("#metricOneValue");
    const metricTwoValue = document.querySelector("#metricTwoValue");
    const metricThreeValue = document.querySelector("#metricThreeValue");
    const hookReadout = document.querySelector("#hookReadout");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const searchable = (spec.id + " " + spec.topic + " " + spec.mechanism + " " + spec.transferable_principle).toLowerCase();

    let stepIndex = 0;
    let autoTimer = null;
    let hookIndex = -1;
    let lastTime = 0;
    let frameCount = 0;
    let motionRunning = !prefersReducedMotion;
    let particles = [];

    function sceneKind() {
      if (searchable.includes("atomic") || searchable.includes("ion") || searchable.includes("isotope") || searchable.includes("electron") || searchable.includes("neutron") || searchable.includes("proton")) return "atomic";
      if (searchable.includes("gradient") || searchable.includes("graph") || searchable.includes("volume") || searchable.includes("mass loss")) return "rateGraph";
      if (searchable.includes("effective collision") || searchable.includes("orientation")) return "collision";
      return "concept";
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function seeded(index) {
      const value = Math.sin(index * 9301 + 49297) * 233280;
      return value - Math.floor(value);
    }

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedParticles();
    }

    function seedParticles() {
      const rect = canvas.getBoundingClientRect();
      const count = sceneKind() === "atomic" ? 22 : 30;
      particles = Array.from({ length: count }, function(_, index) {
        const angle = seeded(index + 2) * Math.PI * 2;
        const speed = 24 + seeded(index + 5) * 42;
        return {
          x: 54 + seeded(index + 11) * Math.max(100, rect.width - 108),
          y: 60 + seeded(index + 17) * Math.max(100, rect.height - 130),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          phase: seeded(index + 29) * Math.PI * 2,
          role: spec.key_symbols[index % spec.key_symbols.length]?.role || "neutral"
        };
      });
    }

    function drawText(text, x, y, options) {
      const opts = options || {};
      ctx.save();
      ctx.fillStyle = opts.color || colors.neutral;
      ctx.font = opts.font || "700 13px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = opts.align || "left";
      ctx.textBaseline = opts.baseline || "alphabetic";
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function wrapLabel(text, x, y, maxWidth, color) {
      const words = String(text).split(" ");
      let line = "";
      let lineY = y;
      ctx.save();
      ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = color || colors.inkSoft;
      words.forEach(function(word) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, x, lineY);
          line = word;
          lineY += 17;
        } else {
          line = test;
        }
      });
      if (line) ctx.fillText(line, x, lineY);
      ctx.restore();
    }

    function activeRole() {
      if (stepIndex === 0) return "problem";
      if (stepIndex === spec.steps.length - 1) return "resolution";
      return "agent";
    }

    function roleColor(role) {
      return colors[role] || colors.neutral;
    }

    function drawArrow(x1, y1, x2, y2, color) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - Math.cos(angle - 0.45) * 12, y2 - Math.sin(angle - 0.45) * 12);
      ctx.lineTo(x2 - Math.cos(angle + 0.45) * 12, y2 - Math.sin(angle + 0.45) * 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawStageFrame(width, height) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#fffdf8";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = colors.rule;
      ctx.lineWidth = 1;
      ctx.strokeRect(28, 28, width - 56, height - 80);
    }

    function drawMovingParticles(delta, time, width, height, box) {
      const bounds = box || { x: 54, y: 64, w: width * 0.42, h: height - 162 };
      ctx.save();
      ctx.fillStyle = "rgba(245, 241, 232, 0.7)";
      ctx.strokeStyle = colors.rule;
      ctx.lineWidth = 2;
      ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
      ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
      particles.forEach(function(p, index) {
        if (motionRunning && !document.hidden) {
          p.x += p.vx * delta;
          p.y += p.vy * delta;
        }
        if (p.x < bounds.x + 8 || p.x > bounds.x + bounds.w - 8) p.vx *= -1;
        if (p.y < bounds.y + 8 || p.y > bounds.y + bounds.h - 8) p.vy *= -1;
        p.x = clamp(p.x, bounds.x + 8, bounds.x + bounds.w - 8);
        p.y = clamp(p.y, bounds.y + 8, bounds.y + bounds.h - 8);
        const pulse = Math.sin(time * 0.006 + p.phase) > 0.86;
        ctx.fillStyle = pulse ? colors.highlight : roleColor(p.role);
        ctx.globalAlpha = pulse ? 0.86 : 0.72;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulse ? 8 : 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawGraph(width, height, progress, decreasing) {
      const gx = width * 0.55;
      const gy = 88;
      const gw = width * 0.37;
      const gh = height * 0.52;
      ctx.save();
      ctx.strokeStyle = colors.neutral;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gx, gy + gh);
      ctx.lineTo(gx, gy);
      ctx.moveTo(gx, gy + gh);
      ctx.lineTo(gx + gw, gy + gh);
      ctx.stroke();
      drawText(decreasing ? "mass" : "product volume", gx - 8, gy - 12, { align: "right", color: colors.inkSoft });
      drawText("time", gx + gw, gy + gh + 28, { align: "right", color: colors.inkSoft });
      ctx.strokeStyle = colors.agent;
      ctx.lineWidth = 5;
      ctx.beginPath();
      const steps = 70;
      for (let i = 0; i <= steps * progress; i += 1) {
        const t = i / steps;
        const x = gx + t * gw;
        const curve = decreasing ? 1 - (1 - Math.exp(-3.2 * t)) * 0.76 : 1 - Math.exp(-3.2 * t);
        const y = gy + gh - curve * gh;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      const markerT = clamp((stepIndex + 1) / spec.steps.length, 0.12, 1);
      const markerCurve = decreasing ? 1 - (1 - Math.exp(-3.2 * markerT)) * 0.76 : 1 - Math.exp(-3.2 * markerT);
      const mx = gx + markerT * gw;
      const my = gy + gh - markerCurve * gh;
      ctx.fillStyle = colors.highlight;
      ctx.beginPath();
      ctx.arc(mx, my, 8, 0, Math.PI * 2);
      ctx.fill();
      drawText(stepIndex === spec.steps.length - 1 ? "zero gradient" : "gradient = rate", mx, my - 16, { align: "center", color: colors.highlight });
      ctx.strokeStyle = colors.good;
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      ctx.moveTo(gx, gy + gh - (decreasing ? 0.24 : 1) * gh);
      ctx.lineTo(gx + gw, gy + gh - (decreasing ? 0.24 : 1) * gh);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    function drawRateGraphScene(delta, time, width, height) {
      const decreasing = searchable.includes("mass");
      const progress = prefersReducedMotion ? 1 : clamp((stepIndex + 0.4 + (Math.sin(time * 0.0015) + 1) * 0.18) / spec.steps.length, 0.12, 1);
      drawMovingParticles(delta, time, width, height, { x: 56, y: 86, w: width * 0.39, h: height * 0.48 });
      drawGraph(width, height, progress, decreasing);
      const bubbleBase = height * 0.65;
      for (let i = 0; i < 9; i += 1) {
        const rise = motionRunning ? (time * 0.035 + i * 33) % 120 : i * 11;
        ctx.strokeStyle = colors.resolution;
        ctx.globalAlpha = 0.3 + progress * 0.45;
        ctx.beginPath();
        ctx.arc(92 + i * 27, bubbleBase - rise, 5 + (i % 3), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      drawText(decreasing ? "gas escaping lowers measured mass" : "gas product accumulates, then levels off", 64, height - 86, { color: colors.resolution });
      metricOneValue.textContent = decreasing ? "escaping gas" : "product curve";
      metricTwoValue.textContent = motionRunning ? "bubbles + particles" : "reduced motion";
      metricThreeValue.textContent = stepIndex === spec.steps.length - 1 ? "plateau" : "gradient";
    }

    function drawCollisionScene(delta, time, width, height) {
      const cx = width / 2;
      const cy = height * 0.42;
      const phase = prefersReducedMotion ? 0.85 : (Math.sin(time * 0.0028) + 1) / 2;
      const offset = 170 * (1 - phase);
      drawArrow(cx - 230, cy, cx - 76 - offset * 0.2, cy, colors.problem);
      drawArrow(cx + 230, cy, cx + 76 + offset * 0.2, cy, colors.agent);
      ctx.fillStyle = colors.problem;
      ctx.beginPath();
      ctx.arc(cx - 54 - offset, cy, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.agent;
      ctx.beginPath();
      ctx.arc(cx + 54 + offset, cy + (stepIndex === 2 ? 26 : 0), 42, 0, Math.PI * 2);
      ctx.fill();
      drawText("reactant A", cx - 54 - offset, cy + 4, { align: "center", color: "#fffdf8" });
      drawText("reactant B", cx + 54 + offset, cy + (stepIndex === 2 ? 30 : 4), { align: "center", color: "#fffdf8" });
      const enoughEnergy = stepIndex >= 1;
      const rightOrientation = stepIndex >= 3;
      ctx.strokeStyle = enoughEnergy && rightOrientation ? colors.good : colors.highlight;
      ctx.lineWidth = 5;
      ctx.globalAlpha = phase > 0.78 ? 0.9 : 0.28;
      ctx.beginPath();
      ctx.arc(cx, cy, 46 + phase * 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      drawText("energy", width * 0.2, height * 0.72, { color: enoughEnergy ? colors.good : colors.problem });
      drawText("orientation", width * 0.5, height * 0.72, { align: "center", color: rightOrientation ? colors.good : colors.problem });
      drawText(enoughEnergy && rightOrientation ? "product forms" : "ineffective collision", width * 0.8, height * 0.72, { align: "right", color: enoughEnergy && rightOrientation ? colors.good : colors.problem });
      metricOneValue.textContent = enoughEnergy ? "energy sufficient" : "energy too low";
      metricTwoValue.textContent = rightOrientation ? "right orientation" : "testing orientation";
      metricThreeValue.textContent = enoughEnergy && rightOrientation ? "effective" : "not yet effective";
    }

    function shellCounts() {
      if (searchable.includes("chlor")) return [2, 8, stepIndex >= 1 ? 8 : 7];
      if (searchable.includes("sodium")) return [2, 8, stepIndex >= 1 ? 0 : 1];
      if (searchable.includes("2-") || searchable.includes("2,8,8")) return [2, 8, 8];
      return [2, 8, Math.max(1, Math.min(8, spec.steps.length + 1))];
    }

    function drawAtom(x, y, radius, time, variant) {
      const counts = shellCounts();
      ctx.save();
      ctx.fillStyle = variant === "heavy" ? colors.problem : colors.neutral;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.arc(x, y, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      drawText(variant === "heavy" ? "p+n+" : "p+n", x, y + 4, { align: "center", color: "#fffdf8" });
      counts.forEach(function(count, shellIndex) {
        const shellRadius = radius * (0.38 + shellIndex * 0.27);
        ctx.strokeStyle = shellIndex === counts.length - 1 ? colors.highlight : colors.rule;
        ctx.lineWidth = shellIndex === counts.length - 1 ? 3 : 2;
        ctx.beginPath();
        ctx.arc(x, y, shellRadius, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < count; i += 1) {
          const spin = motionRunning && !document.hidden ? time * (0.0008 + shellIndex * 0.00025) : 0;
          const angle = (i / Math.max(1, count)) * Math.PI * 2 + spin + shellIndex * 0.45 + (variant === "heavy" ? 0.18 : 0);
          const ex = x + Math.cos(angle) * shellRadius;
          const ey = y + Math.sin(angle) * shellRadius;
          ctx.fillStyle = colors.agent;
          ctx.beginPath();
          ctx.arc(ex, ey, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
    }

    function drawWeightedAverage(width, height, time) {
      const x = width * 0.52;
      const y = height * 0.2;
      const w = width * 0.38;
      const abundance = searchable.includes("chlorine") ? 0.75 : 0.5;
      ctx.save();
      drawText("weighted average", x, y - 18, { color: colors.highlight });
      ctx.strokeStyle = colors.rule;
      ctx.strokeRect(x, y, w, 56);
      ctx.fillStyle = colors.agent;
      ctx.fillRect(x, y, w * abundance, 56);
      ctx.fillStyle = colors.problem;
      ctx.fillRect(x + w * abundance, y, w * (1 - abundance), 56);
      drawText("35 x 75%", x + 14, y + 34, { color: "#fffdf8" });
      drawText("37 x 25%", x + w - 14, y + 34, { align: "right", color: "#fffdf8" });
      const bob = motionRunning ? Math.sin(time * 0.003) * 8 : 0;
      ctx.fillStyle = colors.resolution;
      ctx.beginPath();
      ctx.arc(x + w * 0.75, y + 116 + bob, 26, 0, Math.PI * 2);
      ctx.fill();
      drawText("35.5", x + w * 0.75, y + 121 + bob, { align: "center", color: "#fffdf8" });
      ctx.restore();
    }

    function drawAtomicScene(delta, time, width, height) {
      const isotopeMode = searchable.includes("isotope") || searchable.includes("average mass") || searchable.includes("abundance");
      const notationMode = searchable.includes("notation") || searchable.includes("selection") || searchable.includes("2-");
      if (isotopeMode) {
        drawAtom(width * 0.22, height * 0.39, Math.min(128, width * 0.16), time, "light");
        drawAtom(width * 0.42, height * 0.39, Math.min(128, width * 0.16), time, "heavy");
        drawWeightedAverage(width, height, time);
        drawText("same electrons: same chemical pattern", width * 0.15, height * 0.72, { color: colors.good });
        drawText("different neutrons: mass changes", width * 0.15, height * 0.78, { color: colors.problem });
        metricOneValue.textContent = "isotope comparison";
        metricTwoValue.textContent = motionRunning ? "orbiting electrons" : "reduced motion";
        metricThreeValue.textContent = "mass/electron split";
        return;
      }
      drawAtom(width * 0.36, height * 0.42, Math.min(150, width * 0.18), time, "light");
      if (searchable.includes("gain") || searchable.includes("negative") || searchable.includes("2-")) {
        const t = prefersReducedMotion ? 1 : (Math.sin(time * 0.002) + 1) / 2;
        const sx = width * 0.78;
        const sy = height * 0.24;
        const tx = width * 0.36 + Math.cos(time * 0.001) * 132;
        const ty = height * 0.42 + Math.sin(time * 0.001) * 132;
        const ex = sx + (tx - sx) * clamp(t + stepIndex * 0.08, 0, 1);
        const ey = sy + (ty - sy) * clamp(t + stepIndex * 0.08, 0, 1);
        drawArrow(sx - 18, sy + 12, tx - 24, ty, colors.agent);
        ctx.fillStyle = colors.agent;
        ctx.beginPath();
        ctx.arc(ex, ey, 8, 0, Math.PI * 2);
        ctx.fill();
        drawText("electron gained", width * 0.62, height * 0.18, { color: colors.agent });
      } else if (searchable.includes("loss") || searchable.includes("positive")) {
        const t = prefersReducedMotion ? 1 : (Math.sin(time * 0.002) + 1) / 2;
        const sx = width * 0.36 + 120;
        const sy = height * 0.42 - 30;
        const tx = width * 0.78;
        const ty = height * 0.22;
        const ex = sx + (tx - sx) * clamp(t + stepIndex * 0.08, 0, 1);
        const ey = sy + (ty - sy) * clamp(t + stepIndex * 0.08, 0, 1);
        drawArrow(sx + 8, sy, tx, ty, colors.problem);
        ctx.fillStyle = colors.problem;
        ctx.beginPath();
        ctx.arc(ex, ey, 8, 0, Math.PI * 2);
        ctx.fill();
        drawText("electron lost", width * 0.62, height * 0.18, { color: colors.problem });
      }
      if (notationMode) {
        ctx.strokeStyle = colors.rule;
        ctx.strokeRect(width * 0.58, height * 0.3, width * 0.3, height * 0.26);
        drawText(searchable.includes("oganesson") ? "294" : "2,8,8", width * 0.63, height * 0.39, { font: "800 34px ui-monospace, monospace", color: colors.neutral });
        drawText(searchable.includes("oganesson") ? "Og" : "X 2-", width * 0.7, height * 0.48, { font: "800 42px Georgia, serif", color: colors.agent });
        drawText(searchable.includes("oganesson") ? "118" : "18 - 2 = 16", width * 0.63, height * 0.55, { font: "800 26px ui-monospace, monospace", color: colors.highlight });
      }
      drawText("protons and electrons no longer balance", width * 0.16, height * 0.75, { color: colors.highlight });
      metricOneValue.textContent = "electron movement";
      metricTwoValue.textContent = motionRunning ? "orbiting shells" : "reduced motion";
      metricThreeValue.textContent = searchable.includes("negative") || searchable.includes("gain") ? "anion logic" : "cation/notation logic";
    }

    function drawConceptScene(delta, time, width, height) {
      const y = height * 0.43;
      const xs = [width * 0.22, width * 0.5, width * 0.78];
      const roles = ["problem", "agent", "resolution"];
      roles.forEach(function(role, index) {
        const symbol = spec.key_symbols.find(function(item) { return item.role === role; }) || spec.key_symbols[index % spec.key_symbols.length];
        const active = role === activeRole() || index === stepIndex % roles.length;
        ctx.fillStyle = active ? roleColor(symbol.role) : "#fffdf8";
        ctx.strokeStyle = roleColor(symbol.role);
        ctx.lineWidth = active ? 5 : 3;
        ctx.beginPath();
        ctx.arc(xs[index], y + Math.sin(time * 0.003 + index) * (motionRunning ? 8 : 0), active ? 58 : 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        drawText(symbol.symbol.slice(0, 18), xs[index], y + 5, { align: "center", color: active ? "#fffdf8" : colors.neutral });
        wrapLabel(symbol.meaning, xs[index] - 80, y + 82, 160, colors.inkSoft);
      });
      drawArrow(xs[0] + 70, y, xs[1] - 70, y, colors.neutral);
      drawArrow(xs[1] + 70, y, xs[2] - 70, y, colors.neutral);
      metricOneValue.textContent = "cause and effect";
      metricTwoValue.textContent = motionRunning ? "animated flow" : "reduced motion";
      metricThreeValue.textContent = activeRole();
    }

    function draw(time) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const delta = Math.min(0.04, Math.max(0.001, (time - lastTime) / 1000 || 0.016));
      lastTime = time;
      frameCount += 1;
      drawStageFrame(width, height);
      const kind = sceneKind();
      if (kind === "atomic") drawAtomicScene(delta, time, width, height);
      else if (kind === "rateGraph") drawRateGraphScene(delta, time, width, height);
      else if (kind === "collision") drawCollisionScene(delta, time, width, height);
      else drawConceptScene(delta, time, width, height);
      window.__lessonState = { stepIndex, frameCount, sceneKind: kind, motionRunning };
      if (!document.hidden) {
        requestAnimationFrame(draw);
      }
    }

    function renderSteps() {
      const stepsList = document.querySelector("#stepsList");
      stepsList.replaceChildren();
      spec.steps.forEach(function(step, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "step-btn";
        button.setAttribute("aria-current", index === stepIndex ? "true" : "false");
        button.innerHTML = "<span>" + String(index + 1).padStart(2, "0") + "</span><strong></strong>";
        button.querySelector("strong").textContent = step.name;
        button.addEventListener("click", function() {
          stopAuto();
          stepIndex = index;
          renderText();
        });
        stepsList.append(button);
      });
    }

    function renderText() {
      const step = spec.steps[stepIndex];
      counter.textContent = String(stepIndex + 1).padStart(2, "0") + " / " + String(spec.steps.length).padStart(2, "0");
      stageTitle.textContent = step.name;
      captionName.textContent = step.name;
      captionBeat.textContent = step.beat;
      caption.style.borderLeftColor = roleColor(activeRole());
      metricThreeValue.textContent = "step " + String(stepIndex + 1);
      hookReadout.textContent = hookIndex >= 0 ? "Exploring: " + spec.interactivity_hooks[hookIndex] : "";
      renderSteps();
    }

    function nextStep() {
      stepIndex = (stepIndex + 1) % spec.steps.length;
      renderText();
    }

    function previousStep() {
      stepIndex = (stepIndex - 1 + spec.steps.length) % spec.steps.length;
      renderText();
    }

    function stopAuto() {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
        document.querySelector("#auto").setAttribute("aria-current", "false");
      }
    }

    document.querySelector("#back").addEventListener("click", function() { stopAuto(); previousStep(); });
    document.querySelector("#next").addEventListener("click", function() { stopAuto(); nextStep(); });
    document.querySelector("#restart").addEventListener("click", function() {
      stopAuto();
      stepIndex = 0;
      hookIndex = -1;
      motionRunning = !prefersReducedMotion;
      renderText();
    });
    document.querySelector("#auto").addEventListener("click", function() {
      if (autoTimer) {
        stopAuto();
      } else {
        this.setAttribute("aria-current", "true");
        autoTimer = setInterval(nextStep, 2400);
      }
    });
    document.querySelectorAll(".hook-btn").forEach(function(button) {
      button.addEventListener("click", function() {
        hookIndex = Number(button.dataset.hook);
        document.querySelectorAll(".hook-btn").forEach(function(item) {
          item.setAttribute("aria-current", item === button ? "true" : "false");
        });
        renderText();
      });
    });
    window.addEventListener("resize", resizeCanvas);
    document.addEventListener("visibilitychange", function() {
      if (document.hidden) {
        motionRunning = false;
        stopAuto();
      } else {
        motionRunning = !prefersReducedMotion;
        lastTime = performance.now();
        requestAnimationFrame(draw);
      }
    });
    window.addEventListener("keydown", function(event) {
      if (event.key === "ArrowRight") { stopAuto(); nextStep(); }
      if (event.key === "ArrowLeft") { stopAuto(); previousStep(); }
      if (event.key.toLowerCase() === "r") { stopAuto(); stepIndex = 0; hookIndex = -1; renderText(); }
      if (event.code === "Space") {
        event.preventDefault();
        document.querySelector("#auto").click();
      }
    });

    resizeCanvas();
    renderText();
    requestAnimationFrame(draw);
  </script>
</body>
</html>
`;
}

function htmlForSpec(spec, notes) {
  if (isRateFactorExplorer(spec)) {
    return animatedRateFactorHtml(spec, notes);
  }

  if (spec.render_mode === "static_svg") {
    return legacySvgHtmlForSpec(spec, notes);
  }

  return animatedCanvasSpecHtml(spec, notes);
}

function legacySvgHtmlForSpec(spec, notes) {
  const data = JSON.stringify({ spec, notes }).replaceAll("</script", "<\\/script");
  const isRateFactorSpec = isRateFactorExplorer(spec);

  if (isRateFactorSpec) {
    return animatedRateFactorHtml(spec, notes);
  }

  const hookButtons = isRateFactorSpec
    ? `<div class="factor-controls">
        <label><span>Particle size</span><input type="range" min="1" max="5" step="1" value="3" data-factor="size" /></label>
        <label><span>Concentration</span><input type="range" min="1" max="5" step="1" value="2" data-factor="concentration" /></label>
        <label><span>Pressure</span><input type="range" min="1" max="5" step="1" value="2" data-factor="pressure" /></label>
        <label><span>Temperature</span><input type="range" min="20" max="90" step="10" value="40" data-factor="temperature" /></label>
        <button class="hook-btn" type="button" data-catalyst="toggle">Catalyst off</button>
      </div>`
    : spec.interactivity_hooks.length
      ? spec.interactivity_hooks
          .map(
            (hook, index) =>
              `<button class="hook-btn" type="button" data-hook="${index}">${escapeHtml(hook)}</button>`,
        )
        .join("")
    : `<p class="quiet">This artifact is paced as a cause-and-effect walkthrough.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(notes.title)} - ${escapeHtml(spec.topic)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --problem: #c0392b;
      --agent: #1f6fa6;
      --resolution: #5dade2;
      --neutral: #1a1a1a;
      --highlight: #f1c40f;
      --good: #1e7d4f;
      --bg: #f5f1e8;
      --paper: #fbf8f1;
      --rule: #d8d2c2;
      --ink-soft: #4a4a4a;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--neutral);
      font-family: "Inter Tight", system-ui, sans-serif;
    }

    .shell {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 28px 0 32px;
    }

    header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 24px;
      align-items: end;
      border-bottom: 1px solid var(--rule);
      padding-bottom: 18px;
      margin-bottom: 20px;
    }

    .eyebrow, .source, .counter, .role-chip, button {
      font-family: "JetBrains Mono", monospace;
      letter-spacing: 0;
    }

    .eyebrow {
      color: var(--agent);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    h1 {
      margin: 5px 0 8px;
      font-family: "Fraunces", Georgia, serif;
      font-size: clamp(32px, 5vw, 58px);
      line-height: 0.95;
      letter-spacing: 0;
    }

    .lede {
      margin: 0;
      max-width: 760px;
      color: var(--ink-soft);
      font-size: 17px;
      line-height: 1.45;
    }

    .source {
      color: var(--ink-soft);
      font-size: 12px;
      text-align: right;
      white-space: nowrap;
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 7fr) minmax(280px, 3fr);
      gap: 20px;
      align-items: start;
    }

    .stage, aside, .caption, .panel {
      background: var(--paper);
      border: 1px solid var(--rule);
    }

    .stage {
      min-height: 650px;
      display: grid;
      grid-template-rows: auto minmax(360px, 1fr) auto auto;
    }

    .stage-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 18px 0;
    }

    .counter {
      color: var(--ink-soft);
      font-size: 12px;
    }

    .stage-title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      text-align: right;
      color: var(--neutral);
    }

    svg {
      width: 100%;
      height: 100%;
      min-height: 390px;
      display: block;
    }

    .caption {
      margin: 0 18px 14px;
      padding: 14px 16px;
      border-left: 8px solid var(--highlight);
    }

    .caption strong {
      display: block;
      margin-bottom: 4px;
      font-size: 15px;
    }

    .caption p {
      margin: 0;
      color: var(--ink-soft);
      line-height: 1.45;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0 18px 18px;
    }

    button {
      border: 1px solid var(--neutral);
      background: var(--paper);
      color: var(--neutral);
      min-height: 38px;
      padding: 0 12px;
      font-size: 12px;
      cursor: pointer;
    }

    button:hover, button[aria-current="true"] {
      background: var(--neutral);
      color: var(--paper);
    }

    aside {
      padding: 16px;
    }

    .steps-list {
      display: grid;
      gap: 8px;
      margin-bottom: 16px;
    }

    .step-btn {
      width: 100%;
      text-align: left;
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      padding: 10px;
      min-height: 50px;
    }

    .panel {
      padding: 14px;
      margin-top: 12px;
    }

    .panel h2 {
      margin: 0 0 8px;
      font-size: 13px;
      text-transform: uppercase;
    }

    .panel p {
      margin: 0;
      color: var(--ink-soft);
      line-height: 1.45;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .role-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--rule);
      padding: 5px 7px;
      font-size: 11px;
      background: #fffdf8;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: currentColor;
    }

    .hooks {
      display: grid;
      gap: 8px;
    }

    .factor-controls {
      display: grid;
      gap: 12px;
    }

    .factor-controls label {
      display: grid;
      gap: 6px;
      color: var(--ink-soft);
      font-size: 13px;
    }

    .factor-controls label span {
      color: var(--neutral);
      font-weight: 700;
    }

    .factor-controls input {
      width: 100%;
      accent-color: var(--agent);
    }

    .hook-btn {
      text-align: left;
      min-height: 42px;
      white-space: normal;
      line-height: 1.25;
    }

    .quiet {
      color: var(--ink-soft);
      font-size: 14px;
    }

    footer {
      color: var(--ink-soft);
      border-top: 1px solid var(--rule);
      margin-top: 20px;
      padding-top: 14px;
      font-size: 13px;
    }

    @media (max-width: 820px) {
      header, .layout {
        grid-template-columns: 1fr;
      }

      .source {
        text-align: left;
      }

      .stage {
        min-height: 560px;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div>
        <div class="eyebrow">${escapeHtml(spec.subject)} / ${escapeHtml(spec.source_ref)}</div>
        <h1>${escapeHtml(spec.topic)}</h1>
        <p class="lede">${escapeHtml(spec.mechanism)}</p>
      </div>
      <div class="source">${escapeHtml(notes.id)}<br />${escapeHtml(spec.id)}</div>
    </header>

    <main class="layout">
      <section class="stage" aria-label="Interactive artifact stage">
        <div class="stage-top">
          <div class="counter" id="counter"></div>
          <p class="stage-title" id="stageTitle"></p>
        </div>
        <svg id="scene" viewBox="0 0 900 520" role="img" aria-labelledby="svgTitle svgDesc">
          <title id="svgTitle">${escapeHtml(spec.topic)}</title>
          <desc id="svgDesc">${escapeHtml(spec.mechanism)}</desc>
        </svg>
        <div class="caption" id="caption">
          <strong id="captionName"></strong>
          <p id="captionBeat"></p>
        </div>
        <div class="controls">
          <button type="button" id="back">Back</button>
          <button type="button" id="next">Next</button>
          <button type="button" id="restart">Restart</button>
          <button type="button" id="auto">Auto</button>
        </div>
      </section>

      <aside>
        <div class="steps-list" id="stepsList"></div>

        <div class="panel">
          <h2>Principle</h2>
          <p>${escapeHtml(spec.transferable_principle)}</p>
        </div>

        <div class="panel">
          <h2>Explore</h2>
          <div class="hooks">${hookButtons}</div>
          <p class="quiet" id="hookReadout"></p>
        </div>

        <div class="panel">
          <h2>Legend</h2>
          <div class="legend">
            ${Object.entries(ROLE_COLORS)
              .map(
                ([role, color]) =>
                  `<span class="role-chip" style="color:${color}"><span class="dot"></span>${role}</span>`,
              )
              .join("")}
          </div>
        </div>
      </aside>
    </main>

    <footer>Use Left/Right to move, Space for auto-play, and R to restart.</footer>
  </div>

  <script>
    const DATA = ${data};
    const spec = DATA.spec;
    const colors = ${JSON.stringify({
      ...ROLE_COLORS,
      good: "#1e7d4f",
      paper: "#fbf8f1",
      rule: "#d8d2c2",
      inkSoft: "#4a4a4a",
    })};
    let stepIndex = 0;
    let autoTimer = null;
    let hookIndex = -1;
    const rateFactorMode = ${isRateFactorSpec ? "true" : "false"};
    const factorState = {
      size: 3,
      concentration: 2,
      pressure: 2,
      temperature: 40,
      catalyst: false,
    };
    const rateStepPresets = [
      { size: 4, concentration: 2, pressure: 2, temperature: 40, catalyst: false },
      { size: 2, concentration: 4, pressure: 4, temperature: 40, catalyst: false },
      { size: 4, concentration: 2, pressure: 2, temperature: 80, catalyst: false },
      { size: 4, concentration: 2, pressure: 2, temperature: 40, catalyst: true },
      { size: 2, concentration: 4, pressure: 4, temperature: 80, catalyst: true },
    ];

    const scene = document.querySelector("#scene");
    const counter = document.querySelector("#counter");
    const stageTitle = document.querySelector("#stageTitle");
    const caption = document.querySelector("#caption");
    const captionName = document.querySelector("#captionName");
    const captionBeat = document.querySelector("#captionBeat");
    const hookReadout = document.querySelector("#hookReadout");

    function svgEl(name, attrs = {}) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", name);
      for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value);
      }
      return el;
    }

    function makeParticle(symbol, x, y, r, active) {
      const group = svgEl("g", { transform: "translate(" + x + " " + y + ")" });
      const color = colors[symbol.role] || colors.neutral;
      group.append(
        svgEl("circle", {
          r,
          fill: active ? color : "#fffdf8",
          stroke: color,
          "stroke-width": active ? 5 : 3,
        }),
      );

      const text = svgEl("text", {
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-size": symbol.symbol.length > 12 ? 17 : 22,
        "font-family": "JetBrains Mono, monospace",
        fill: active ? "#fffdf8" : colors.neutral,
      });
      text.textContent = symbol.symbol;
      group.append(text);
      return group;
    }

    function rand(seed) {
      const value = Math.sin(seed * 9301 + 49297) * 233280;
      return value - Math.floor(value);
    }

    function roleLane(role) {
      if (role === "problem") return 185;
      if (role === "agent") return 450;
      if (role === "resolution") return 715;
      if (role === "highlight") return 450;
      return 450;
    }

    function roleY(symbol, index, total) {
      if (symbol.role === "neutral") return 410;
      if (symbol.role === "highlight") return 115;
      const spread = Math.min(170, Math.max(0, (total - 1) * 52));
      return 250 - spread / 2 + index * 52;
    }

    function currentRole() {
      if (stepIndex === 0) return "problem";
      if (stepIndex === spec.steps.length - 1) return "resolution";
      return "agent";
    }

    function activeSymbolIndex() {
      if (!spec.key_symbols.length) return -1;
      const preferred = spec.key_symbols.findIndex((symbol) => symbol.role === currentRole());
      return preferred >= 0 ? preferred : stepIndex % spec.key_symbols.length;
    }

    function appendText(attrs, textContent) {
      const text = svgEl("text", attrs);
      text.textContent = textContent;
      scene.append(text);
      return text;
    }

    function syncFactorControls() {
      document.querySelectorAll("[data-factor]").forEach((input) => {
        input.value = String(factorState[input.dataset.factor]);
      });
      const catalystButton = document.querySelector("[data-catalyst='toggle']");
      if (catalystButton) {
        catalystButton.textContent = factorState.catalyst ? "Catalyst on" : "Catalyst off";
        catalystButton.setAttribute("aria-current", factorState.catalyst ? "true" : "false");
      }
    }

    function applyRateStepPreset(index) {
      if (!rateFactorMode) return;
      Object.assign(factorState, rateStepPresets[index] || rateStepPresets[0]);
      syncFactorControls();
    }

    function rateMetrics() {
      const surfaceArea = (6 - factorState.size) / 3;
      const crowding = factorState.concentration / 2.2;
      const compression = factorState.pressure / 2.4;
      const motion = 0.7 + (factorState.temperature - 20) / 75;
      const threshold = factorState.catalyst ? 0.34 : 0.62;
      const energyFraction = Math.max(0.12, Math.min(0.95, (motion - threshold + 0.35) / 1.05));
      const collisionFrequency = surfaceArea * crowding * compression * motion;
      const rate = Math.max(0.06, Math.min(1, (collisionFrequency * energyFraction) / 5));

      return { surfaceArea, crowding, compression, motion, energyFraction, collisionFrequency, rate };
    }

    function drawRateFactorScene() {
      scene.replaceChildren();

      const defs = svgEl("defs");
      const marker = svgEl("marker", {
        id: "arrow",
        viewBox: "0 0 10 10",
        refX: "8",
        refY: "5",
        markerWidth: "7",
        markerHeight: "7",
        orient: "auto-start-reverse",
      });
      marker.append(svgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: colors.neutral }));
      defs.append(marker);
      scene.append(defs);

      const metrics = rateMetrics();
      const contactActive = stepIndex === 1 || stepIndex === 4;
      const energyActive = stepIndex === 2 || stepIndex === 4;
      const catalystActive = stepIndex === 3 || stepIndex === 4;
      const boxWidth = 340 - (factorState.pressure - 1) * 22;
      const boxX = 80 + (340 - boxWidth) / 2;
      const particleCount = Math.round(9 + factorState.concentration * 5 + factorState.pressure * 3);
      const particleRadius = 23 - factorState.size * 2.4;

      scene.append(svgEl("rect", { x: boxX, y: 88, width: boxWidth, height: 300, fill: "#fffdf8", stroke: contactActive ? colors.highlight : colors.neutral, "stroke-width": contactActive ? 7 : 3 }));
      appendText({ x: boxX + boxWidth / 2, y: 72, "text-anchor": "middle", "font-size": 15, "font-family": "JetBrains Mono, monospace", fill: contactActive ? colors.agent : colors.neutral }, contactActive ? "more contact chances" : "reacting particles");

      for (let i = 0; i < particleCount; i += 1) {
        const x = boxX + 34 + rand(i + 5) * (boxWidth - 68);
        const y = 122 + rand(i + 19) * 230;
        const isEffective = rand(i + factorState.temperature) < metrics.energyFraction;
        const color = isEffective ? colors.agent : colors.problem;
        scene.append(svgEl("circle", { cx: x, cy: y, r: particleRadius, fill: isEffective ? color : "#fffdf8", stroke: color, "stroke-width": isEffective ? 4 : 3, opacity: isEffective ? 0.9 : 0.95 }));

        const dx = (rand(i + 41) - 0.5) * 50 * metrics.motion;
        const dy = (rand(i + 67) - 0.5) * 42 * metrics.motion;
        scene.append(svgEl("path", { d: "M " + x + " " + y + " l " + dx + " " + dy, stroke: colors.highlight, "stroke-width": energyActive ? 3 : 2, opacity: energyActive ? 0.7 : 0.35, "marker-end": "url(#arrow)" }));
      }

      if (contactActive) {
        scene.append(svgEl("rect", { x: 116, y: 405, width: 305, height: 44, fill: "#fffdf8", stroke: colors.agent, "stroke-width": 2 }));
        appendText({ x: 132, y: 432, "font-size": 15, "font-family": "JetBrains Mono, monospace", fill: colors.agent }, "smaller pieces + more particles + less volume");
      }

      const catalystX = 455;
      scene.append(svgEl("line", { x1: catalystX, x2: catalystX, y1: 92, y2: 388, stroke: "#d8d2c2", "stroke-width": 2 }));
      const barrierBase = "M 510 350 C 585 350, 595 165, 666 165 C 735 165, 750 350, 820 350";
      const barrierCatalyst = "M 510 350 C 588 350, 605 245, 666 245 C 728 245, 745 350, 820 350";
      scene.append(svgEl("path", { d: barrierBase, fill: "none", stroke: colors.problem, "stroke-width": energyActive || catalystActive ? 7 : 5, opacity: factorState.catalyst ? 0.22 : 1 }));
      scene.append(svgEl("path", { d: barrierCatalyst, fill: "none", stroke: colors.agent, "stroke-width": catalystActive ? 7 : 5, opacity: factorState.catalyst ? 1 : 0.24 }));
      appendText({ x: 665, y: 118, "text-anchor": "middle", "font-size": 15, "font-family": "JetBrains Mono, monospace", fill: energyActive ? colors.highlight : colors.problem }, energyActive ? "more particles have enough energy" : "activation energy");
      appendText({ x: 665, y: 412, "text-anchor": "middle", "font-size": 14, fill: colors.neutral }, factorState.catalyst ? "catalyst lowers the barrier" : "temperature changes particle energy, not the barrier");

      if (catalystActive) {
        scene.append(svgEl("path", { d: "M 665 175 L 665 245", stroke: colors.highlight, "stroke-width": 4, "marker-end": "url(#arrow)" }));
        appendText({ x: 665, y: 270, "text-anchor": "middle", "font-size": 15, "font-family": "JetBrains Mono, monospace", fill: colors.agent }, "lower barrier");
      }

      const barX = 520;
      const barY = 468;
      const barWidth = 300;
      scene.append(svgEl("rect", { x: barX, y: barY, width: barWidth, height: 24, fill: "#efe7d4", stroke: "#d8d2c2" }));
      scene.append(svgEl("rect", { x: barX, y: barY, width: Math.max(12, barWidth * metrics.rate), height: 24, fill: colors.good }));
      appendText({ x: 80, y: 485, "font-size": 16, "font-family": "JetBrains Mono, monospace", fill: stepIndex === 4 ? colors.good : colors.neutral }, stepIndex === 4 ? "combined predicted reaction rate" : "predicted reaction rate");
      appendText({ x: barX + barWidth + 12, y: 486, "font-size": 16, "font-family": "JetBrains Mono, monospace", fill: colors.good }, Math.round(metrics.rate * 100) + "%");
    }

    function drawScene() {
      if (rateFactorMode) {
        drawRateFactorScene();
        return;
      }

      scene.replaceChildren();

      const defs = svgEl("defs");
      const marker = svgEl("marker", {
        id: "arrow",
        viewBox: "0 0 10 10",
        refX: "8",
        refY: "5",
        markerWidth: "7",
        markerHeight: "7",
        orient: "auto-start-reverse",
      });
      marker.append(svgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: colors.neutral }));
      defs.append(marker);
      scene.append(defs);

      const bg = svgEl("rect", {
        x: 38,
        y: 40,
        width: 824,
        height: 418,
        rx: 0,
        fill: "#fffdf8",
        stroke: "#d8d2c2",
      });
      scene.append(bg);

      const laneLabels = [
        ["problem", "what is acted on", 185],
        ["agent", "what changes it", 450],
        ["resolution", "what results", 715],
      ];
      for (const [role, label, x] of laneLabels) {
        scene.append(svgEl("line", { x1: x, x2: x, y1: 84, y2: 420, stroke: "#e5dece", "stroke-dasharray": "7 8" }));
        const text = svgEl("text", {
          x,
          y: 72,
          "text-anchor": "middle",
          "font-size": 13,
          "font-family": "JetBrains Mono, monospace",
          fill: colors[role],
        });
        text.textContent = label;
        scene.append(text);
      }

      scene.append(svgEl("path", {
        d: "M 260 250 C 335 190, 375 190, 410 230",
        fill: "none",
        stroke: colors.neutral,
        "stroke-width": 3,
        "marker-end": "url(#arrow)",
      }));
      scene.append(svgEl("path", {
        d: "M 500 230 C 555 190, 620 190, 650 250",
        fill: "none",
        stroke: colors.neutral,
        "stroke-width": 3,
        "marker-end": "url(#arrow)",
      }));

      const roleCounts = {};
      for (const symbol of spec.key_symbols) {
        roleCounts[symbol.role] = (roleCounts[symbol.role] || 0) + 1;
      }

      const roleSeen = {};
      const activeIndex = activeSymbolIndex();
      spec.key_symbols.forEach((symbol, index) => {
        const localIndex = roleSeen[symbol.role] || 0;
        roleSeen[symbol.role] = localIndex + 1;
        const pulse = index === activeIndex || symbol.role === currentRole();
        const x = roleLane(symbol.role) + (hookIndex >= 0 ? (rand(index + hookIndex + 3) - 0.5) * 28 : 0);
        const y = roleY(symbol, localIndex, roleCounts[symbol.role]) + (hookIndex >= 0 ? (rand(index + hookIndex + 11) - 0.5) * 18 : 0);
        scene.append(makeParticle(symbol, x, y, pulse ? 54 : 43, pulse));

        const meaning = svgEl("text", {
          x,
          y: y + 76,
          "text-anchor": "middle",
          "font-size": 13,
          fill: colors.neutral,
        });
        meaning.textContent = symbol.meaning.length > 34 ? symbol.meaning.slice(0, 31) + "..." : symbol.meaning;
        scene.append(meaning);
      });

      const stepPulse = svgEl("circle", {
        cx: stepIndex === 0 ? 185 : stepIndex === spec.steps.length - 1 ? 715 : 450,
        cy: 250,
        r: 112 + stepIndex * 4,
        fill: "none",
        stroke: colors.highlight,
        "stroke-width": 6,
        opacity: 0.35,
      });
      scene.append(stepPulse);
    }

    function renderSteps() {
      const stepsList = document.querySelector("#stepsList");
      stepsList.replaceChildren();
      spec.steps.forEach((step, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "step-btn";
        btn.setAttribute("aria-current", index === stepIndex ? "true" : "false");
        btn.innerHTML = "<span>" + String(index + 1).padStart(2, "0") + "</span><strong></strong>";
        btn.querySelector("strong").textContent = step.name;
        btn.addEventListener("click", () => {
          stepIndex = index;
          applyRateStepPreset(stepIndex);
          stopAuto();
          render();
        });
        stepsList.append(btn);
      });
    }

    function render() {
      const step = spec.steps[stepIndex];
      counter.textContent = String(stepIndex + 1).padStart(2, "0") + " / " + String(spec.steps.length).padStart(2, "0");
      stageTitle.textContent = step.name;
      captionName.textContent = step.name;
      captionBeat.textContent = step.beat;
      caption.style.borderLeftColor = colors[currentRole()];
      if (rateFactorMode) {
        const metrics = rateMetrics();
        const catalystText = factorState.catalyst ? "on" : "off";
        hookReadout.textContent =
          "Rate " + Math.round(metrics.rate * 100) +
          "% | effective-energy fraction " + Math.round(metrics.energyFraction * 100) +
          "% | catalyst " + catalystText;
      } else if (hookIndex >= 0) {
        hookReadout.textContent = "Exploring: " + spec.interactivity_hooks[hookIndex];
      } else {
        hookReadout.textContent = "";
      }
      drawScene();
      renderSteps();
    }

    function nextStep() {
      stepIndex = (stepIndex + 1) % spec.steps.length;
      applyRateStepPreset(stepIndex);
      render();
    }

    function previousStep() {
      stepIndex = (stepIndex - 1 + spec.steps.length) % spec.steps.length;
      applyRateStepPreset(stepIndex);
      render();
    }

    function stopAuto() {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
        document.querySelector("#auto").setAttribute("aria-current", "false");
      }
    }

    document.querySelector("#back").addEventListener("click", () => { stopAuto(); previousStep(); });
    document.querySelector("#next").addEventListener("click", () => { stopAuto(); nextStep(); });
    document.querySelector("#restart").addEventListener("click", () => { stopAuto(); stepIndex = 0; hookIndex = -1; render(); });
    document.querySelector("#auto").addEventListener("click", () => {
      if (autoTimer) {
        stopAuto();
      } else {
        document.querySelector("#auto").setAttribute("aria-current", "true");
        autoTimer = setInterval(nextStep, 1700);
      }
    });

    document.querySelectorAll(".hook-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.catalyst === "toggle") {
          factorState.catalyst = !factorState.catalyst;
          btn.textContent = factorState.catalyst ? "Catalyst on" : "Catalyst off";
          btn.setAttribute("aria-current", factorState.catalyst ? "true" : "false");
          render();
          return;
        }

        hookIndex = Number(btn.dataset.hook);
        document.querySelectorAll(".hook-btn").forEach((button) => {
          button.setAttribute("aria-current", button === btn ? "true" : "false");
        });
        render();
      });
    });

    document.querySelectorAll("[data-factor]").forEach((input) => {
      input.addEventListener("input", () => {
        factorState[input.dataset.factor] = Number(input.value);
        render();
      });
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") { stopAuto(); nextStep(); }
      if (event.key === "ArrowLeft") { stopAuto(); previousStep(); }
      if (event.key.toLowerCase() === "r") { stopAuto(); stepIndex = 0; hookIndex = -1; render(); }
      if (event.code === "Space") {
        event.preventDefault();
        document.querySelector("#auto").click();
      }
    });

    applyRateStepPreset(0);
    render();
  </script>
</body>
</html>
`;
}

function animatedCanvasArtifactHtml(spec, notes) {
  const data = JSON.stringify({ spec, notes }).replaceAll("</script", "<\\/script");

  const hookButtons = spec.interactivity_hooks.length
    ? spec.interactivity_hooks
        .map(
          (hook, index) =>
            `<button class="hook-btn" type="button" data-hook="${index}">${escapeHtml(hook)}</button>`,
        )
        .join("")
    : `<p class="quiet">This artifact is paced as a cause-and-effect walkthrough.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(notes.title)} - ${escapeHtml(spec.topic)}</title>
  <style>
    :root {
      --problem: #c0392b;
      --agent: #1f6fa6;
      --resolution: #5dade2;
      --neutral: #1a1a1a;
      --highlight: #f1c40f;
      --good: #1e7d4f;
      --bg: #f5f1e8;
      --paper: #fbf8f1;
      --rule: #d8d2c2;
      --ink-soft: #4a4a4a;
    }

    * { box-sizing: border-box; }

    html, body { min-height: 100%; }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--neutral);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .shell {
      width: min(1180px, calc(100vw - 28px));
      margin: 0 auto;
      padding: 24px 0 28px;
    }

    header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: end;
      border-bottom: 1px solid var(--rule);
      padding-bottom: 16px;
      margin-bottom: 18px;
    }

    .eyebrow, .source, .counter, button, .stat, .step-btn, .pill {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      letter-spacing: 0;
    }

    .eyebrow {
      color: var(--agent);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    h1 {
      margin: 4px 0 8px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(34px, 5vw, 62px);
      line-height: 0.94;
      letter-spacing: 0;
    }

    .lede {
      margin: 0;
      max-width: 780px;
      color: var(--ink-soft);
      font-size: 17px;
      line-height: 1.42;
    }

    .source {
      color: var(--ink-soft);
      font-size: 12px;
      text-align: right;
      white-space: nowrap;
    }

    .lesson {
      display: grid;
      grid-template-columns: minmax(0, 7fr) minmax(294px, 3fr);
      gap: 20px;
      align-items: start;
    }

    .stage, aside, .panel, .caption {
      background: var(--paper);
      border: 1px solid var(--rule);
    }

    .stage {
      min-height: 690px;
      display: grid;
      grid-template-rows: auto minmax(430px, 1fr) auto auto;
    }

    .stage-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 18px 0;
    }

    .counter {
      color: var(--ink-soft);
      font-size: 12px;
    }

    .stage-title {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
      text-align: right;
    }

    .animation-wrap {
      position: relative;
      min-height: 430px;
      margin: 10px 18px 0;
      background: #fffdf8;
      border: 1px solid var(--rule);
      overflow: hidden;
    }

    canvas {
      width: 100%;
      height: 100%;
      min-height: 430px;
      display: block;
    }

    .stat-row {
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: 12px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      pointer-events: none;
    }

    .stat {
      min-height: 48px;
      padding: 8px 10px;
      background: rgba(251, 248, 241, 0.93);
      border: 1px solid var(--rule);
      font-size: 12px;
    }

    .stat strong {
      display: block;
      margin-bottom: 3px;
      color: var(--neutral);
      font-size: 15px;
    }

    .caption {
      margin: 14px 18px;
      padding: 14px 16px;
      border-left: 8px solid var(--highlight);
    }

    .caption strong {
      display: block;
      margin-bottom: 4px;
      font-size: 15px;
    }

    .caption p {
      margin: 0;
      color: var(--ink-soft);
      line-height: 1.43;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0 18px 18px;
    }

    button {
      border: 1px solid var(--neutral);
      background: var(--paper);
      color: var(--neutral);
      min-height: 38px;
      padding: 0 12px;
      font-size: 12px;
      cursor: pointer;
    }

    button:hover, button[aria-current="true"] {
      background: var(--neutral);
      color: var(--paper);
    }

    aside {
      padding: 16px;
    }

    .steps-list {
      display: grid;
      gap: 8px;
      margin-bottom: 16px;
    }

    .step-btn {
      width: 100%;
      text-align: left;
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      padding: 10px;
      min-height: 50px;
    }

    .panel {
      padding: 14px;
      margin-top: 12px;
    }

    .panel h2 {
      margin: 0 0 8px;
      font-size: 13px;
      text-transform: uppercase;
    }

    .panel p {
      margin: 0;
      color: var(--ink-soft);
      line-height: 1.45;
    }

    .hooks {
      display: grid;
      gap: 8px;
    }

    .hook-btn {
      text-align: left;
      min-height: 42px;
      white-space: normal;
      line-height: 1.25;
    }

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--rule);
      padding: 5px 7px;
      font-size: 11px;
      background: #fffdf8;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: currentColor;
    }

    .quiet {
      color: var(--ink-soft);
      font-size: 14px;
    }

    footer {
      color: var(--ink-soft);
      border-top: 1px solid var(--rule);
      margin-top: 20px;
      padding-top: 14px;
      font-size: 13px;
    }

    @media (max-width: 820px) {
      header, .lesson {
        grid-template-columns: 1fr;
      }

      .source {
        text-align: left;
      }

      .stat-row {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <div>
        <div class="eyebrow">${escapeHtml(spec.subject)} / ${escapeHtml(spec.source_ref)}</div>
        <h1>${escapeHtml(spec.topic)}</h1>
        <p class="lede">${escapeHtml(spec.mechanism)}</p>
      </div>
      <div class="source">${escapeHtml(notes.id)}<br />canvas-first artifact</div>
    </header>

    <main class="lesson">
      <section class="stage" aria-label="Animated artifact stage">
        <div class="stage-top">
          <div class="counter" id="counter"></div>
          <p class="stage-title" id="stageTitle"></p>
        </div>

        <div class="animation-wrap">
          <canvas id="lessonCanvas" aria-label="${escapeHtml(spec.topic)} animated simulation"></canvas>
          <div class="stat-row" aria-live="polite">
            <div class="stat"><strong id="statA">0</strong><span id="statALabel">progress</span></div>
            <div class="stat"><strong id="statB">0</strong><span id="statBLabel">motion</span></div>
            <div class="stat"><strong id="statC">0</strong><span id="statCLabel">focus</span></div>
          </div>
        </div>

        <div class="caption" id="caption">
          <strong id="captionName"></strong>
          <p id="captionBeat"></p>
        </div>

        <div class="controls">
          <button type="button" id="back">Back</button>
          <button type="button" id="next">Next</button>
          <button type="button" id="restart">Restart</button>
          <button type="button" id="auto">Auto</button>
          <button type="button" id="motion">Pause motion</button>
        </div>
      </section>

      <aside>
        <div class="steps-list" id="stepsList"></div>

        <div class="panel">
          <h2>Principle</h2>
          <p>${escapeHtml(spec.transferable_principle)}</p>
          <div class="pill-row">
            ${Object.entries(ROLE_COLORS)
              .map(
                ([role, color]) =>
                  `<span class="pill" style="color:${color}"><span class="dot"></span>${role}</span>`,
              )
              .join("")}
          </div>
        </div>

        <div class="panel">
          <h2>Explore</h2>
          <div class="hooks">${hookButtons}</div>
          <p class="quiet" id="hookReadout"></p>
        </div>
      </aside>
    </main>

    <footer>Self-contained HTML for sandboxed iframe rendering: no external scripts, no remote assets, and no parent-page access. Use Left/Right, Space for auto-play, and R to restart.</footer>
  </div>

  <script>
    const DATA = ${data};
    const spec = DATA.spec;
    const colors = ${JSON.stringify({
      ...ROLE_COLORS,
      good: "#1e7d4f",
      paper: "#fbf8f1",
      rule: "#d8d2c2",
      inkSoft: "#4a4a4a",
    })};
    const textIndex = (spec.id + " " + spec.topic + " " + spec.mechanism).toLowerCase();
    const canvas = document.querySelector("#lessonCanvas");
    const ctx = canvas.getContext("2d");
    const counter = document.querySelector("#counter");
    const stageTitle = document.querySelector("#stageTitle");
    const caption = document.querySelector("#caption");
    const captionName = document.querySelector("#captionName");
    const captionBeat = document.querySelector("#captionBeat");
    const hookReadout = document.querySelector("#hookReadout");
    const statA = document.querySelector("#statA");
    const statB = document.querySelector("#statB");
    const statC = document.querySelector("#statC");
    const statALabel = document.querySelector("#statALabel");
    const statBLabel = document.querySelector("#statBLabel");
    const statCLabel = document.querySelector("#statCLabel");
    const motionButton = document.querySelector("#motion");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stepIndex = 0;
    let hookIndex = -1;
    let autoTimer = null;
    let lastTime = 0;
    let motionRunning = !prefersReducedMotion;
    let seed = 7;
    const movers = [];
    const pulses = [];

    if (prefersReducedMotion) {
      motionButton.textContent = "Resume motion";
      motionButton.setAttribute("aria-current", "true");
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function seeded() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    function rand(min, max) {
      return min + seeded() * (max - min);
    }

    function sceneMode() {
      if (/relative atomic mass|weighted|abundance|average mass|35\\.5/.test(textIndex)) return "weighted";
      if (/isotope/.test(textIndex)) return "isotope";
      if (/atom|ion|electron|proton|neutron|shell|notation|2,8,8|oganesson|sodium|chlorine|chloride/.test(textIndex)) return "atomic";
      if (/graph|gradient|curve|plateau|volume|mass loss|gas/.test(textIndex)) return "graph";
      if (/collision|rate|concentration|pressure|temperature|catalyst|activation energy|particle/.test(textIndex)) return "rate";
      return "flow";
    }

    const mode = sceneMode();

    function syncMotionButton() {
      motionButton.textContent = motionRunning ? "Pause motion" : "Resume motion";
      motionButton.setAttribute("aria-current", motionRunning ? "false" : "true");
    }

    function currentRole() {
      if (stepIndex === 0) return "problem";
      if (stepIndex === spec.steps.length - 1) return "resolution";
      return "agent";
    }

    function currentColor() {
      return colors[currentRole()] || colors.neutral;
    }

    function resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      resetMovers();
    }

    function resetMovers() {
      seed = 11 + spec.id.length * 17;
      movers.length = 0;
      const width = canvas.clientWidth || 900;
      const height = canvas.clientHeight || 430;
      const count = mode === "atomic" ? 24 : mode === "weighted" ? 30 : mode === "graph" ? 22 : 28;
      for (let i = 0; i < count; i += 1) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(20, 62);
        movers.push({
          x: rand(width * 0.08, width * 0.92),
          y: rand(height * 0.16, height * 0.72),
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          orbit: rand(0, Math.PI * 2),
          role: (spec.key_symbols[i % spec.key_symbols.length] || { role: "neutral" }).role,
        });
      }
    }

    function drawText(text, x, y, options) {
      const opts = options || {};
      ctx.save();
      ctx.fillStyle = opts.color || colors.neutral;
      ctx.font = opts.font || "700 13px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = opts.align || "left";
      ctx.textBaseline = opts.baseline || "alphabetic";
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function wrapText(text, x, y, maxWidth, lineHeight, options) {
      const words = String(text).split(/\\s+/);
      let line = "";
      let lineY = y;
      ctx.save();
      ctx.font = options && options.font ? options.font : "600 13px ui-sans-serif, system-ui, sans-serif";
      ctx.fillStyle = options && options.color ? options.color : colors.inkSoft || "#4a4a4a";
      ctx.textAlign = options && options.align ? options.align : "left";
      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          ctx.fillText(line, x, lineY);
          line = word;
          lineY += lineHeight;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, x, lineY);
      ctx.restore();
    }

    function roundedRect(x, y, w, h, radius) {
      const r = Math.min(radius, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function drawPanel(x, y, w, h, title) {
      ctx.save();
      ctx.fillStyle = "#fffdf8";
      ctx.strokeStyle = colors.rule || "#d8d2c2";
      ctx.lineWidth = 1;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      if (title) drawText(title, x + 14, y + 26, { color: colors.neutral });
      ctx.restore();
    }

    function drawArrow(x1, y1, x2, y2, color) {
      const angle = Math.atan2(y2 - y1, x2 - x1);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - Math.cos(angle - 0.55) * 12, y2 - Math.sin(angle - 0.55) * 12);
      ctx.lineTo(x2 - Math.cos(angle + 0.55) * 12, y2 - Math.sin(angle + 0.55) * 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawMovingParticle(p, radius, alpha) {
      const color = colors[p.role] || colors.agent;
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.fillStyle = p.role === "problem" ? "#fffdf8" : color;
      ctx.strokeStyle = color;
      ctx.lineWidth = p.role === currentRole() ? 4 : 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    function updateMovers(delta, speedScale) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!motionRunning) return;
      movers.forEach(function(p) {
        p.x += p.vx * delta * speedScale;
        p.y += p.vy * delta * speedScale;
        if (p.x < 34 || p.x > width - 34) p.vx *= -1;
        if (p.y < 58 || p.y > height - 94) p.vy *= -1;
        p.x = clamp(p.x, 34, width - 34);
        p.y = clamp(p.y, 58, height - 94);
        p.orbit += delta * speedScale;
      });
    }

    function drawRateScene(delta, time, width, height) {
      const progress = (stepIndex + 1) / spec.steps.length;
      const boxX = width * 0.06;
      const boxY = height * 0.15;
      const boxW = width * 0.38;
      const boxH = height * 0.53;
      drawPanel(boxX, boxY, boxW, boxH, /pressure/.test(textIndex) ? "compressed gas particles" : "reacting particles");
      updateMovers(delta, 0.85 + progress);
      movers.forEach(function(p, index) {
        if (p.x < boxX || p.x > boxX + boxW || p.y < boxY || p.y > boxY + boxH) {
          p.x = boxX + 22 + (index * 37) % Math.max(40, boxW - 44);
          p.y = boxY + 38 + (index * 53) % Math.max(60, boxH - 76);
        }
        drawMovingParticle(p, 8 + progress * 3, 0.9);
        if (motionRunning && index % 7 === stepIndex % 7) {
          pulses.push({ x: p.x, y: p.y, age: 0, color: colors.highlight });
        }
      });

      const graphX = width * 0.52;
      const graphY = height * 0.18;
      const graphW = width * 0.38;
      const graphH = height * 0.43;
      drawPanel(graphX, graphY, graphW, graphH, /catalyst|temperature|activation/.test(textIndex) ? "energy barrier" : "product-time graph");

      ctx.save();
      ctx.strokeStyle = colors.neutral;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(graphX + 34, graphY + graphH - 34);
      ctx.lineTo(graphX + graphW - 24, graphY + graphH - 34);
      ctx.moveTo(graphX + 34, graphY + graphH - 34);
      ctx.lineTo(graphX + 34, graphY + 48);
      ctx.stroke();

      if (/catalyst|temperature|activation/.test(textIndex)) {
        const baseY = graphY + graphH - 54;
        const high = graphY + 68;
        const low = graphY + 128;
        ctx.lineWidth = 5;
        ctx.strokeStyle = colors.problem;
        ctx.beginPath();
        ctx.moveTo(graphX + 46, baseY);
        ctx.bezierCurveTo(graphX + graphW * 0.35, baseY, graphX + graphW * 0.38, high, graphX + graphW * 0.52, high);
        ctx.bezierCurveTo(graphX + graphW * 0.68, high, graphX + graphW * 0.72, baseY, graphX + graphW - 42, baseY);
        ctx.stroke();
        ctx.globalAlpha = stepIndex >= 1 ? 1 : 0.25;
        ctx.strokeStyle = colors.agent;
        ctx.beginPath();
        ctx.moveTo(graphX + 46, baseY);
        ctx.bezierCurveTo(graphX + graphW * 0.35, baseY, graphX + graphW * 0.41, low, graphX + graphW * 0.52, low);
        ctx.bezierCurveTo(graphX + graphW * 0.65, low, graphX + graphW * 0.72, baseY, graphX + graphW - 42, baseY);
        ctx.stroke();
        ctx.globalAlpha = 1;
        drawText("lower barrier = more successful particles", graphX + graphW / 2, graphY + graphH - 12, { align: "center", color: colors.agent });
      } else {
        ctx.strokeStyle = colors.agent;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(graphX + 36, graphY + graphH - 38);
        ctx.bezierCurveTo(graphX + 80, graphY + graphH - 118 - progress * 46, graphX + graphW * 0.5, graphY + 72, graphX + graphW - 34, graphY + 72);
        ctx.stroke();
        ctx.strokeStyle = colors.highlight;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(graphX + 36, graphY + 72);
        ctx.lineTo(graphX + graphW - 28, graphY + 72);
        ctx.stroke();
        ctx.setLineDash([]);
        drawText(/same final|plateau|excess/.test(textIndex) ? "same plateau" : "rate = gradient", graphX + graphW - 34, graphY + 58, { align: "right", color: colors.highlight });
      }
      ctx.restore();

      statA.textContent = Math.round(progress * 100) + "%";
      statALabel.textContent = "mechanism revealed";
      statB.textContent = (1 + progress * 2.4).toFixed(1) + "x";
      statBLabel.textContent = "collision motion";
      statC.textContent = stepIndex === spec.steps.length - 1 ? "linked" : "watch";
      statCLabel.textContent = "rate clue";
    }

    function drawAtomicScene(delta, time, width, height) {
      const cx = width * 0.36;
      const cy = height * 0.42;
      const progress = (stepIndex + 1) / spec.steps.length;
      const shells = /2,8,8|two-minus|2-/.test(textIndex) ? [2, 8, 8] : /chlor/.test(textIndex) ? [2, 8, stepIndex >= 1 ? 8 : 7] : [2, 8, stepIndex >= 1 && /sodium|positive|cation|loss/.test(textIndex) ? 0 : 1];
      drawPanel(width * 0.06, height * 0.12, width * 0.58, height * 0.62, /notation|oganesson/.test(textIndex) ? "particle-count rules" : "electron shell simulation");

      ctx.save();
      ctx.fillStyle = colors.problem;
      ctx.strokeStyle = colors.neutral;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawText(/oganesson/.test(textIndex) ? "118p" : /chlor/.test(textIndex) ? "17p" : "11p", cx, cy + 4, { align: "center", color: "#fffdf8" });

      shells.forEach(function(count, shellIndex) {
        const radius = 78 + shellIndex * 54;
        ctx.strokeStyle = colors.rule || "#d8d2c2";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < count; i += 1) {
          const angle = (i / Math.max(1, count)) * Math.PI * 2 + time * 0.00035 * (shellIndex + 1) * (motionRunning ? 1 : 0);
          const ex = cx + Math.cos(angle) * radius;
          const ey = cy + Math.sin(angle) * radius;
          ctx.fillStyle = colors.agent;
          ctx.strokeStyle = colors.agent;
          ctx.beginPath();
          ctx.arc(ex, ey, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      const electronChange = /gain|anion|negative|2-/.test(textIndex) ? 1 : /loss|cation|positive|sodium/.test(textIndex) ? -1 : 0;
      if (electronChange !== 0) {
        const fromX = electronChange > 0 ? width * 0.08 : cx + 78 + Math.sin(time * 0.004) * 18;
        const toX = electronChange > 0 ? cx + 78 + Math.sin(time * 0.004) * 18 : width * 0.68;
        const y = cy - 118 + Math.cos(time * 0.004) * 20;
        drawArrow(fromX, y, toX, y, colors.highlight);
        ctx.fillStyle = colors.highlight;
        ctx.beginPath();
        ctx.arc(fromX + (toX - fromX) * clamp(progress, 0.15, 0.9), y, 8, 0, Math.PI * 2);
        ctx.fill();
        drawText(electronChange > 0 ? "electron gained" : "electron lost", (fromX + toX) / 2, y - 16, { align: "center", color: colors.highlight });
      }

      const cardX = width * 0.69;
      const cardY = height * 0.15;
      drawPanel(cardX, cardY, width * 0.25, height * 0.5, "counts");
      const protons = /oganesson/.test(textIndex) ? 118 : /chlor/.test(textIndex) ? 17 : /two-minus|2-/.test(textIndex) ? 16 : 11;
      const electrons = /chloride|anion|negative/.test(textIndex) ? 18 : /sodium|cation|positive/.test(textIndex) && stepIndex >= 1 ? 10 : /two-minus|2-/.test(textIndex) ? 18 : protons;
      const neutrons = /oganesson/.test(textIndex) ? 176 : /isotope/.test(textIndex) ? "varies" : "same nucleus";
      drawText("protons: " + protons, cardX + 18, cardY + 74, { color: colors.problem });
      drawText("electrons: " + electrons, cardX + 18, cardY + 112, { color: colors.agent });
      drawText("neutrons: " + neutrons, cardX + 18, cardY + 150, { color: colors.neutral });
      drawText("charge: " + (electrons > protons ? "-" + (electrons - protons) : protons > electrons ? "+" + (protons - electrons) : "0"), cardX + 18, cardY + 198, { color: colors.highlight });
      ctx.restore();

      statA.textContent = String(protons);
      statALabel.textContent = "protons";
      statB.textContent = String(electrons);
      statBLabel.textContent = "electrons";
      statC.textContent = electrons > protons ? "-" + (electrons - protons) : protons > electrons ? "+" + (protons - electrons) : "0";
      statCLabel.textContent = "charge";
    }

    function drawIsotopeScene(delta, time, width, height) {
      const progress = (stepIndex + 1) / spec.steps.length;
      drawPanel(width * 0.06, height * 0.13, width * 0.4, height * 0.55, "isotope A");
      drawPanel(width * 0.54, height * 0.13, width * 0.4, height * 0.55, "isotope B");
      [0, 1].forEach(function(side) {
        const cx = side === 0 ? width * 0.26 : width * 0.74;
        const cy = height * 0.38;
        const neutronExtra = side === 0 ? 0 : 6;
        for (let i = 0; i < 12 + neutronExtra; i += 1) {
          const angle = (i / (12 + neutronExtra)) * Math.PI * 2 + time * 0.0002;
          const r = 18 + (i % 3) * 10;
          ctx.fillStyle = i % 2 === 0 ? colors.problem : colors.neutral;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = colors.agent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 98, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 8; i += 1) {
          const angle = i / 8 * Math.PI * 2 + time * 0.00055 * (motionRunning ? 1 : 0);
          ctx.fillStyle = colors.agent;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(angle) * 98, cy + Math.sin(angle) * 98, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        drawText(side === 0 ? "same electrons" : "extra neutrons", cx, height * 0.62, { align: "center", color: side === 0 ? colors.agent : colors.highlight });
      });
      drawArrow(width * 0.45, height * 0.38, width * 0.54, height * 0.38, colors.highlight);
      statA.textContent = "same";
      statALabel.textContent = "chemical properties";
      statB.textContent = "different";
      statBLabel.textContent = "mass";
      statC.textContent = Math.round(progress * 100) + "%";
      statCLabel.textContent = "comparison";
    }

    function drawWeightedScene(delta, time, width, height) {
      const progress = (stepIndex + 1) / spec.steps.length;
      drawPanel(width * 0.06, height * 0.14, width * 0.88, height * 0.5, "weighted abundance simulation");
      const baseX = width * 0.12;
      const baseY = height * 0.46;
      const total = 24;
      for (let i = 0; i < total; i += 1) {
        const isLight = i < 18;
        const x = baseX + (i % 12) * (width * 0.06);
        const y = baseY - Math.floor(i / 12) * 72 + Math.sin(time * 0.004 + i) * (motionRunning ? 5 : 0);
        ctx.fillStyle = isLight ? colors.agent : colors.problem;
        ctx.strokeStyle = colors.neutral;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, isLight ? 15 : 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        drawText(isLight ? "35" : "37", x, y + 4, { align: "center", color: "#fffdf8", font: "700 12px ui-monospace, SFMono-Regular, Menlo, monospace" });
      }
      const barX = width * 0.2;
      const barY = height * 0.68;
      const barW = width * 0.6;
      ctx.fillStyle = "#efe7d4";
      ctx.fillRect(barX, barY, barW, 28);
      ctx.fillStyle = colors.agent;
      ctx.fillRect(barX, barY, barW * 0.75, 28);
      ctx.fillStyle = colors.problem;
      ctx.fillRect(barX + barW * 0.75, barY, barW * 0.25, 28);
      ctx.strokeStyle = colors.neutral;
      ctx.strokeRect(barX, barY, barW, 28);
      drawText("75% x 35", barX + barW * 0.375, barY + 48, { align: "center", color: colors.agent });
      drawText("25% x 37", barX + barW * 0.875, barY + 48, { align: "center", color: colors.problem });
      drawText("relative atomic mass = 35.5", width * 0.5, barY + 88, { align: "center", color: colors.good, font: "800 18px ui-monospace, SFMono-Regular, Menlo, monospace" });
      statA.textContent = "75%";
      statALabel.textContent = "chlorine-35";
      statB.textContent = "25%";
      statBLabel.textContent = "chlorine-37";
      statC.textContent = "35.5";
      statCLabel.textContent = "weighted average";
    }

    function drawFlowScene(delta, time, width, height) {
      const active = stepIndex % Math.max(1, spec.key_symbols.length);
      drawPanel(width * 0.06, height * 0.16, width * 0.88, height * 0.48, "mechanism map");
      spec.key_symbols.forEach(function(symbol, index) {
        const x = width * (0.16 + index * (0.68 / Math.max(1, spec.key_symbols.length - 1)));
        const y = height * 0.39 + Math.sin(time * 0.003 + index) * (motionRunning ? 12 : 0);
        const color = colors[symbol.role] || colors.neutral;
        ctx.fillStyle = index === active ? color : "#fffdf8";
        ctx.strokeStyle = color;
        ctx.lineWidth = index === active ? 5 : 3;
        ctx.beginPath();
        ctx.arc(x, y, index === active ? 42 : 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        drawText(symbol.symbol.slice(0, 14), x, y + 4, { align: "center", color: index === active ? "#fffdf8" : colors.neutral });
        if (index < spec.key_symbols.length - 1) drawArrow(x + 48, y, width * (0.16 + (index + 1) * (0.68 / Math.max(1, spec.key_symbols.length - 1))) - 48, y, colors.rule || "#d8d2c2");
      });
      statA.textContent = String(stepIndex + 1);
      statALabel.textContent = "active step";
      statB.textContent = String(spec.key_symbols.length);
      statBLabel.textContent = "symbols";
      statC.textContent = hookIndex >= 0 ? "hook" : "auto";
      statCLabel.textContent = "scene mode";
    }

    function drawPulses(delta) {
      for (let i = pulses.length - 1; i >= 0; i -= 1) {
        const pulse = pulses[i];
        pulse.age += delta;
        const alpha = 1 - pulse.age / 0.7;
        if (alpha <= 0 || pulses.length > 36) {
          pulses.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = pulse.color || colors.highlight;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, 8 + pulse.age * 72, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    function draw(time) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const delta = Math.min(0.04, Math.max(0.001, (time - lastTime) / 1000 || 0.016));
      lastTime = time;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#fffdf8";
      ctx.fillRect(0, 0, width, height);
      drawText("canvas simulation: " + mode, 18, 28, { color: colors.inkSoft || "#4a4a4a" });
      if (mode === "atomic") drawAtomicScene(delta, time, width, height);
      else if (mode === "isotope") drawIsotopeScene(delta, time, width, height);
      else if (mode === "weighted") drawWeightedScene(delta, time, width, height);
      else if (mode === "rate" || mode === "graph") drawRateScene(delta, time, width, height);
      else drawFlowScene(delta, time, width, height);
      drawPulses(delta);
      requestAnimationFrame(draw);
    }

    function renderSteps() {
      const stepsList = document.querySelector("#stepsList");
      stepsList.replaceChildren();
      spec.steps.forEach(function(step, index) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "step-btn";
        btn.setAttribute("aria-current", index === stepIndex ? "true" : "false");
        btn.innerHTML = "<span>" + String(index + 1).padStart(2, "0") + "</span><strong></strong>";
        btn.querySelector("strong").textContent = step.name;
        btn.addEventListener("click", function() {
          stopAuto();
          stepIndex = index;
          renderText();
        });
        stepsList.append(btn);
      });
    }

    function renderText() {
      const step = spec.steps[stepIndex];
      counter.textContent = String(stepIndex + 1).padStart(2, "0") + " / " + String(spec.steps.length).padStart(2, "0");
      stageTitle.textContent = step.name;
      captionName.textContent = step.name;
      captionBeat.textContent = step.beat;
      caption.style.borderLeftColor = currentColor();
      hookReadout.textContent = hookIndex >= 0 ? "Exploring: " + spec.interactivity_hooks[hookIndex] : "";
      renderSteps();
    }

    function nextStep() {
      stepIndex = (stepIndex + 1) % spec.steps.length;
      renderText();
    }

    function previousStep() {
      stepIndex = (stepIndex - 1 + spec.steps.length) % spec.steps.length;
      renderText();
    }

    function stopAuto() {
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
        document.querySelector("#auto").setAttribute("aria-current", "false");
      }
    }

    document.querySelector("#back").addEventListener("click", function() { stopAuto(); previousStep(); });
    document.querySelector("#next").addEventListener("click", function() { stopAuto(); nextStep(); });
    document.querySelector("#restart").addEventListener("click", function() {
      stopAuto();
      stepIndex = 0;
      hookIndex = -1;
      resetMovers();
      renderText();
    });
    document.querySelector("#auto").addEventListener("click", function() {
      if (autoTimer) {
        stopAuto();
      } else {
        this.setAttribute("aria-current", "true");
        autoTimer = setInterval(nextStep, 2300);
      }
    });
    motionButton.addEventListener("click", function() {
      motionRunning = !motionRunning;
      syncMotionButton();
    });
    document.querySelectorAll(".hook-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        hookIndex = Number(btn.dataset.hook);
        document.querySelectorAll(".hook-btn").forEach(function(button) {
          button.setAttribute("aria-current", button === btn ? "true" : "false");
        });
        pulses.push({ x: canvas.clientWidth * 0.5, y: canvas.clientHeight * 0.38, age: 0, color: colors.highlight });
        renderText();
      });
    });
    window.addEventListener("resize", resizeCanvas);
    document.addEventListener("visibilitychange", function() {
      if (document.hidden) {
        motionRunning = false;
        syncMotionButton();
        stopAuto();
      }
    });
    window.addEventListener("keydown", function(event) {
      if (event.key === "ArrowRight") { stopAuto(); nextStep(); }
      if (event.key === "ArrowLeft") { stopAuto(); previousStep(); }
      if (event.key.toLowerCase() === "r") { stopAuto(); stepIndex = 0; hookIndex = -1; resetMovers(); renderText(); }
      if (event.code === "Space") {
        event.preventDefault();
        document.querySelector("#auto").click();
      }
    });

    resizeCanvas();
    syncMotionButton();
    renderText();
    requestAnimationFrame(draw);
  </script>
</body>
</html>
`;
}

function canvasFirstHtmlForSpec(spec, notes) {
  if (isRateFactorExplorer(spec)) {
    return animatedRateFactorHtml(spec, notes);
  }

  if (spec.render_mode === "static_svg") {
    return htmlForSpec(spec, notes);
  }

  return animatedCanvasArtifactHtml(spec, notes);
}

async function renderManifest(manifestPath) {
  const absoluteManifestPath = path.resolve(manifestPath);
  const bundleDir = path.dirname(absoluteManifestPath);
  const manifest = JSON.parse(await readFile(absoluteManifestPath, "utf8"));
  const specs = manifest.artifacts || [];
  const errors = specs.flatMap((spec, index) => validateSpec(spec, index));

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  for (const spec of specs) {
    const filePath = spec.file_path || path.join("artifacts", spec.output_filename);
    const absoluteOutputPath = path.resolve(bundleDir, filePath);
    await mkdir(path.dirname(absoluteOutputPath), { recursive: true });
    await writeFile(absoluteOutputPath, canvasFirstHtmlForSpec(spec, manifest.notes), "utf8");
    console.log(`rendered ${path.relative(process.cwd(), absoluteOutputPath)}`);
  }
}

const manifestPaths = process.argv.slice(2);

if (manifestPaths.length === 0) {
  console.error("Usage: node scripts/render-seed-artifacts.mjs <manifest.json> [...]");
  process.exit(1);
}

for (const manifestPath of manifestPaths) {
  await renderManifest(manifestPath);
}
