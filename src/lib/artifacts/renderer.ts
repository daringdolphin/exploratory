import type { ArtifactSpec, BuiltArtifact } from "./schema";

const roleLabels: Record<string, string> = {
  problem: "Problem",
  agent: "Agent",
  resolution: "Resolution",
  neutral: "Structure",
  highlight: "Focus",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function artifactJson(spec: ArtifactSpec) {
  return JSON.stringify(spec)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function buildArtifactHtml(spec: ArtifactSpec) {
  const title = escapeHtml(spec.topic);
  const data = artifactJson(spec);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
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
      min-height: 100vh;
      background: var(--bg);
      color: var(--neutral);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    button {
      color: inherit;
      font: inherit;
    }

    .shell {
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 30px 0;
    }

    .eyebrow {
      margin: 0 0 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      letter-spacing: 0;
      text-transform: uppercase;
      color: var(--ink-soft);
    }

    h1 {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(30px, 4vw, 52px);
      line-height: 0.98;
      letter-spacing: 0;
      max-width: 780px;
    }

    .lede {
      margin: 14px 0 24px;
      max-width: 820px;
      color: var(--ink-soft);
      font-size: 18px;
      line-height: 1.45;
    }

    .grid {
      display: grid;
      grid-template-columns: minmax(0, 7fr) minmax(280px, 3fr);
      gap: 18px;
      align-items: start;
    }

    .stage, .sidebar {
      border: 1px solid var(--rule);
      border-radius: 8px;
      background: var(--paper);
    }

    .stage {
      overflow: hidden;
    }

    .stage-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 18px;
      border-bottom: 1px solid var(--rule);
    }

    .counter, .stage-title, .step-index, .role-pill {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .stage-title {
      text-align: right;
      color: var(--ink-soft);
    }

    .scene-wrap {
      padding: 18px;
      position: relative;
    }

    canvas {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      border: 1px solid var(--rule);
      border-radius: 8px;
      background:
        linear-gradient(90deg, rgba(216, 210, 194, 0.35) 1px, transparent 1px),
        linear-gradient(rgba(216, 210, 194, 0.35) 1px, transparent 1px);
      background-size: 32px 32px;
    }

    .caption {
      margin: 0 18px 16px;
      border-left: 5px solid var(--highlight);
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.44);
      color: var(--neutral);
      min-height: 78px;
    }

    .caption h2 {
      margin: 0 0 4px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 22px;
      letter-spacing: 0;
    }

    .caption p {
      margin: 0;
      color: var(--ink-soft);
      line-height: 1.45;
    }

    .controls {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding: 0 18px 18px;
    }

    .controls button, .steps button, .symbol {
      border: 1px solid var(--rule);
      border-radius: 8px;
      background: #fffaf0;
      cursor: pointer;
      transition: border-color 150ms ease, transform 150ms ease, background 150ms ease;
    }

    .controls button {
      padding: 9px 12px;
      min-width: 78px;
      font-weight: 700;
    }

    .controls button:hover, .steps button:hover, .symbol:hover {
      transform: translateY(-1px);
      border-color: var(--neutral);
    }

    .sidebar {
      padding: 16px;
    }

    .steps {
      display: grid;
      gap: 8px;
      margin-bottom: 16px;
    }

    .steps button {
      width: 100%;
      padding: 11px;
      text-align: left;
      display: grid;
      grid-template-columns: 34px 1fr;
      gap: 10px;
      align-items: center;
    }

    .steps button[aria-current="true"] {
      border-color: var(--highlight);
      background: rgba(241, 196, 15, 0.16);
    }

    .step-index {
      color: var(--ink-soft);
    }

    .panel {
      border-top: 1px solid var(--rule);
      padding-top: 14px;
      margin-top: 14px;
    }

    .panel h3 {
      margin: 0 0 8px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 20px;
      letter-spacing: 0;
    }

    .panel p {
      margin: 0;
      color: var(--ink-soft);
      line-height: 1.45;
    }

    .symbols {
      display: grid;
      gap: 8px;
    }

    .symbol {
      padding: 10px;
      text-align: left;
    }

    .role-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 5px;
      color: var(--ink-soft);
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--role-color);
      border: 1px solid rgba(26, 26, 26, 0.22);
    }

    .symbol strong {
      display: block;
      margin-bottom: 2px;
    }

    .symbol span {
      color: var(--ink-soft);
      line-height: 1.35;
    }

    footer {
      margin-top: 18px;
      color: var(--ink-soft);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
    }

    @media (max-width: 800px) {
      .grid {
        grid-template-columns: 1fr;
      }

      .stage-head {
        display: grid;
      }

      .stage-title {
        text-align: left;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header>
      <p class="eyebrow" id="eyebrow"></p>
      <h1 id="title"></h1>
      <p class="lede" id="mechanism"></p>
    </header>

    <section class="grid">
      <article class="stage">
        <div class="stage-head">
          <div class="counter" id="counter"></div>
          <div class="stage-title" id="stage-title"></div>
        </div>
        <div class="scene-wrap">
          <canvas id="scene" role="img" aria-label="${title} animated canvas simulation"></canvas>
        </div>
        <div class="caption" id="caption">
          <h2 id="caption-title"></h2>
          <p id="caption-copy"></p>
        </div>
        <div class="controls">
          <button id="back" type="button">Back</button>
          <button id="next" type="button">Next</button>
          <button id="restart" type="button">Restart</button>
          <button id="auto" type="button">Auto</button>
          <button id="motion" type="button">Pause motion</button>
        </div>
      </article>

      <aside class="sidebar">
        <div class="steps" id="steps"></div>
        <div class="panel">
          <h3>Principle</h3>
          <p id="principle"></p>
        </div>
        <div class="panel">
          <h3>Legend</h3>
          <div class="symbols" id="symbols"></div>
        </div>
        <div class="panel">
          <h3>Explore</h3>
          <div class="symbols" id="hooks"></div>
        </div>
      </aside>
    </section>

    <footer id="footer"></footer>
  </main>

  <script>
    const spec = ${data};
    const roleNames = ${JSON.stringify(roleLabels)};
    const roleColors = {
      problem: "#c0392b",
      agent: "#1f6fa6",
      resolution: "#5dade2",
      neutral: "#1a1a1a",
      highlight: "#f1c40f",
      good: "#1e7d4f",
      paper: "#fbf8f1",
      rule: "#d8d2c2",
      inkSoft: "#4a4a4a",
    };

    let stepIndex = 0;
    let autoTimer = null;
    let selectedSymbol = null;
    let selectedHook = -1;
    let motionRunning = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationId = null;
    let lastTime = 0;
    let seed = 17 + spec.id.length * 23;
    const particles = [];
    const pulses = [];

    const canvas = document.getElementById("scene");
    const ctx = canvas.getContext("2d");
    const stepsEl = document.getElementById("steps");
    const symbolsEl = document.getElementById("symbols");
    const hooksEl = document.getElementById("hooks");
    const caption = document.getElementById("caption");
    const motionButton = document.getElementById("motion");

    function rand() {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      resetParticles();
    }

    function renderStaticText() {
      document.getElementById("eyebrow").textContent = spec.subject + " / " + spec.source_ref;
      document.getElementById("title").textContent = spec.topic;
      document.getElementById("mechanism").textContent = spec.mechanism;
      document.getElementById("principle").textContent = spec.transferable_principle;
      document.getElementById("footer").textContent = "Self-contained canvas HTML for sandboxed iframe rendering; no remote assets, network calls, or parent-page access.";
    }

    function renderSteps() {
      stepsEl.replaceChildren();
      spec.steps.forEach((step, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("aria-current", index === stepIndex ? "true" : "false");
        button.addEventListener("click", () => setStep(index));
        const count = document.createElement("span");
        count.className = "step-index";
        count.textContent = String(index + 1).padStart(2, "0");
        const label = document.createElement("strong");
        label.textContent = step.name;
        button.append(count, label);
        stepsEl.append(button);
      });
    }

    function renderSymbols() {
      symbolsEl.replaceChildren();
      spec.key_symbols.forEach((symbol, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "symbol";
        button.style.setProperty("--role-color", roleColors[symbol.role] || roleColors.neutral);
        button.addEventListener("click", () => {
          selectedSymbol = selectedSymbol === index ? null : index;
          renderScene();
          renderSymbols();
        });

        const role = document.createElement("span");
        role.className = "role-pill";
        const dot = document.createElement("span");
        dot.className = "dot";
        const roleText = document.createElement("span");
        roleText.textContent = roleNames[symbol.role] || symbol.role;
        role.append(dot, roleText);

        const name = document.createElement("strong");
        name.textContent = symbol.symbol;
        const meaning = document.createElement("span");
        meaning.textContent = symbol.meaning;
        button.append(role, name, meaning);
        if (selectedSymbol === index) {
          button.style.borderColor = roleColors.highlight;
        }
        symbolsEl.append(button);
      });
    }

    function renderHooks() {
      hooksEl.replaceChildren();
      if (!spec.interactivity_hooks.length) {
        const note = document.createElement("p");
        note.textContent = "Step through the mechanism; no extra control is needed.";
        hooksEl.append(note);
        return;
      }

      spec.interactivity_hooks.forEach((hook, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "symbol";
        button.textContent = hook;
        button.setAttribute("aria-current", selectedHook === index ? "true" : "false");
        button.addEventListener("click", () => {
          selectedHook = selectedHook === index ? -1 : index;
          pulses.push({ x: canvas.clientWidth / 2, y: canvas.clientHeight / 2, age: 0 });
          renderHooks();
        });
        hooksEl.append(button);
      });
    }

    function resetParticles() {
      particles.length = 0;
      const width = canvas.clientWidth || 900;
      const height = canvas.clientHeight || 500;
      const count = Math.max(18, Math.min(42, spec.key_symbols.length * 7 + spec.steps.length * 3));
      for (let i = 0; i < count; i += 1) {
        const symbol = spec.key_symbols[i % spec.key_symbols.length] || { role: "neutral", symbol: "particle" };
        const angle = rand() * Math.PI * 2;
        particles.push({
          x: 36 + rand() * Math.max(1, width - 72),
          y: 36 + rand() * Math.max(1, height - 72),
          vx: Math.cos(angle) * (28 + rand() * 42),
          vy: Math.sin(angle) * (28 + rand() * 42),
          r: 7 + rand() * 5,
          role: symbol.role,
          phase: rand() * Math.PI * 2,
        });
      }
    }

    function setStep(next) {
      stepIndex = Math.max(0, Math.min(spec.steps.length - 1, next));
      const step = spec.steps[stepIndex];
      document.getElementById("counter").textContent = "Step " + (stepIndex + 1) + " / " + spec.steps.length;
      document.getElementById("stage-title").textContent = step.name;
      document.getElementById("caption-title").textContent = step.name;
      document.getElementById("caption-copy").textContent = step.beat;
      const activeSymbol = spec.key_symbols[Math.min(stepIndex, spec.key_symbols.length - 1)];
      caption.style.borderLeftColor = activeSymbol ? roleColors[activeSymbol.role] : roleColors.highlight;
      pulses.push({ x: canvas.clientWidth * (0.22 + stepIndex * 0.13), y: canvas.clientHeight * 0.5, age: 0 });
      renderSteps();
      renderSymbols();
    }

    function toggleAuto() {
      const auto = document.getElementById("auto");
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
        auto.textContent = "Auto";
        return;
      }
      auto.textContent = "Pause";
      autoTimer = setInterval(() => {
        setStep(stepIndex === spec.steps.length - 1 ? 0 : stepIndex + 1);
      }, 1600);
    }

    function syncMotionButton() {
      motionButton.textContent = motionRunning ? "Pause motion" : "Resume motion";
      motionButton.setAttribute("aria-current", motionRunning ? "false" : "true");
    }

    function drawText(text, x, y, options = {}) {
      ctx.save();
      ctx.fillStyle = options.color || roleColors.neutral;
      ctx.font = options.font || "700 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      ctx.textAlign = options.align || "left";
      ctx.textBaseline = options.baseline || "alphabetic";
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    function drawArrow(from, to, color, width) {
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.translate(to.x, to.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-12, -6);
      ctx.lineTo(-12, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function draw(time) {
      animationId = null;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const delta = Math.min(0.04, Math.max(0.001, (time - lastTime) / 1000 || 0.016));
      lastTime = time;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#fffdf8";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = roleColors.rule;
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const activeRatio = (stepIndex + 1) / spec.steps.length;
      const hookBoost = selectedHook >= 0 ? 1.35 : 1;
      const symbolCount = Math.max(1, spec.key_symbols.length);
      const nodes = spec.key_symbols.map((symbol, index) => {
        const x = 90 + index * ((width - 180) / Math.max(1, symbolCount - 1));
        const y = height * 0.52 + Math.sin(time * 0.0012 + index) * 18;
        return { x, y, symbol };
      });

      particles.forEach((particle, index) => {
        if (motionRunning) {
          particle.x += particle.vx * delta * hookBoost * (0.7 + activeRatio);
          particle.y += particle.vy * delta * hookBoost * (0.7 + activeRatio);
        }
        if (particle.x < particle.r || particle.x > width - particle.r) particle.vx *= -1;
        if (particle.y < particle.r || particle.y > height - particle.r) particle.vy *= -1;
        particle.x = clamp(particle.x, particle.r, width - particle.r);
        particle.y = clamp(particle.y, particle.r, height - particle.r);

        const active = index / particles.length < activeRatio;
        ctx.globalAlpha = active ? 0.88 : 0.28;
        ctx.fillStyle = roleColors[particle.role] || roleColors.neutral;
        ctx.strokeStyle = active ? roleColors.highlight : roleColors.neutral;
        ctx.lineWidth = active ? 2.5 : 1;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.r + Math.sin(time * 0.004 + particle.phase) * 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      nodes.forEach((node, index) => {
        if (index < nodes.length - 1) {
          drawArrow(node, nodes[index + 1], index <= stepIndex ? roleColors.highlight : roleColors.rule, index <= stepIndex ? 4 : 2);
        }
      });

      nodes.forEach((node, index) => {
        const active = selectedSymbol === index || index <= stepIndex;
        const color = roleColors[node.symbol.role] || roleColors.neutral;
        ctx.fillStyle = "#fffdf8";
        ctx.strokeStyle = active ? roleColors.highlight : color;
        ctx.lineWidth = active ? 7 : 4;
        ctx.beginPath();
        ctx.arc(node.x, node.y, active ? 48 : 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        drawText(node.symbol.symbol, node.x, node.y + 5, {
          align: "center",
          color,
          font: "800 14px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        });
      });

      for (let i = pulses.length - 1; i >= 0; i -= 1) {
        const pulse = pulses[i];
        pulse.age += delta;
        const alpha = 1 - pulse.age / 0.7;
        if (alpha <= 0) {
          pulses.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = roleColors.highlight;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, 12 + pulse.age * 90, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      drawText("canvas simulation", 18, 28, { color: roleColors.inkSoft });
      drawText(spec.steps[stepIndex].name, width - 18, 28, { align: "right", color: roleColors.neutral });

      if (!document.hidden) scheduleDraw();
    }

    function scheduleDraw() {
      if (animationId === null) {
        animationId = requestAnimationFrame(draw);
      }
    }

    document.getElementById("back").addEventListener("click", () => setStep(stepIndex - 1));
    document.getElementById("next").addEventListener("click", () => setStep(stepIndex + 1));
    document.getElementById("restart").addEventListener("click", () => setStep(0));
    document.getElementById("auto").addEventListener("click", toggleAuto);
    motionButton.addEventListener("click", () => {
      motionRunning = !motionRunning;
      syncMotionButton();
    });
    window.addEventListener("resize", resizeCanvas);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        motionRunning = false;
        syncMotionButton();
        if (autoTimer) toggleAuto();
        if (animationId !== null) {
          cancelAnimationFrame(animationId);
          animationId = null;
        }
      } else {
        lastTime = performance.now();
        scheduleDraw();
      }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "ArrowLeft") setStep(stepIndex - 1);
      if (event.key === "ArrowRight") setStep(stepIndex + 1);
      if (event.key === "r" || event.key === "R") setStep(0);
      if (event.key === " ") {
        event.preventDefault();
        toggleAuto();
      }
    });

    renderStaticText();
    renderHooks();
    renderSymbols();
    resizeCanvas();
    syncMotionButton();
    setStep(0);
    scheduleDraw();
  </script>
</body>
</html>`;
}

export function buildArtifact(spec: ArtifactSpec): BuiltArtifact {
  return {
    ...spec,
    html: buildArtifactHtml(spec),
  };
}
