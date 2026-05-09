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
      --problem: #c84a36;
      --agent: #087a8a;
      --resolution: #58a58f;
      --neutral: #151913;
      --highlight: #e0b32d;
      --good: #207857;
      --bg: #ede8d9;
      --paper: #fff8ea;
      --paper-strong: #fffdf6;
      --rule: #cabf9e;
      --ink-soft: #626b5f;
      --shadow: #10201d;
    }

    * { box-sizing: border-box; }

    html, body {
      min-height: 100%;
      overflow-x: hidden;
    }

    body {
      margin: 0;
      background:
        linear-gradient(135deg, rgba(255, 248, 234, 0.96), rgba(221, 233, 225, 0.92) 52%, rgba(242, 225, 188, 0.82)),
        repeating-linear-gradient(0deg, rgba(21, 25, 19, 0.028) 0 1px, transparent 1px 28px),
        repeating-linear-gradient(90deg, rgba(21, 25, 19, 0.024) 0 1px, transparent 1px 28px);
      color: var(--neutral);
      font-family: "Avenir Next", "Trebuchet MS", sans-serif;
    }

    button, input { color: inherit; font: inherit; }

    button:focus-visible,
    input:focus-visible {
      outline: 3px solid rgba(8, 122, 138, 0.26);
      outline-offset: 2px;
    }

    .shell {
      width: min(1180px, calc(100vw - 24px));
      margin: 0 auto;
      padding: 22px 0 26px;
      animation: load-in 560ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }

    .artifact-hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: end;
      margin-bottom: 16px;
      border-bottom: 1px solid rgba(21, 25, 19, 0.14);
      padding-bottom: 14px;
    }

    .eyebrow,
    .source-chip,
    .counter,
    .stage-title,
    button,
    .metric,
    .range-field span,
    .symbol-role,
    footer {
      font-family: "Andale Mono", "Courier New", monospace;
      letter-spacing: 0;
    }

    .eyebrow {
      margin: 0;
      color: var(--agent);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    h1 {
      max-width: 820px;
      margin: 6px 0 8px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: clamp(36px, 5vw, 68px);
      line-height: 0.94;
      letter-spacing: 0;
      overflow-wrap: anywhere;
    }

    .lede {
      max-width: 860px;
      margin: 0;
      color: var(--ink-soft);
      font-size: 17px;
      line-height: 1.48;
      overflow-wrap: anywhere;
    }

    .source-chip {
      border: 1px solid rgba(21, 25, 19, 0.16);
      background: rgba(255, 253, 246, 0.72);
      color: var(--neutral);
      font-size: 12px;
      font-weight: 800;
      padding: 10px 12px;
      text-align: right;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .artifact-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.72fr) minmax(294px, 0.72fr);
      gap: 16px;
      align-items: stretch;
      max-width: 100%;
    }

    .stage,
    .control-panel {
      min-width: 0;
      border: 1px solid rgba(21, 25, 19, 0.15);
      background: rgba(255, 248, 234, 0.78);
      box-shadow: 0 24px 70px rgba(16, 32, 29, 0.12);
      overflow: hidden;
    }

    .stage {
      display: grid;
      grid-template-rows: auto minmax(390px, 1fr) auto auto;
      min-height: 660px;
    }

    .stage-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      border-bottom: 1px solid rgba(21, 25, 19, 0.12);
      padding: 14px 16px;
    }

    .counter,
    .stage-title {
      color: var(--ink-soft);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .canvas-wrap {
      position: relative;
      min-height: 390px;
      margin: 14px;
      border: 1px solid rgba(21, 25, 19, 0.14);
      background: var(--paper-strong);
      overflow: hidden;
      animation: canvas-in 680ms 80ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }

    canvas {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 390px;
    }

    .metric-row {
      position: absolute;
      right: 12px;
      bottom: 12px;
      left: 12px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      pointer-events: none;
    }

    .metric {
      min-height: 54px;
      border: 1px solid rgba(21, 25, 19, 0.12);
      background: rgba(255, 253, 246, 0.84);
      color: var(--ink-soft);
      font-size: 11px;
      padding: 8px 10px;
    }

    .metric strong {
      display: block;
      margin-bottom: 3px;
      color: var(--neutral);
      font-size: 17px;
    }

    .caption {
      min-height: 94px;
      margin: 0 14px 14px;
      border-left: 7px solid var(--highlight);
      background: rgba(255, 253, 246, 0.72);
      padding: 13px 15px;
    }

    .caption h2 {
      margin: 0 0 5px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 24px;
      line-height: 1;
      letter-spacing: 0;
    }

    .caption p {
      margin: 0;
      color: var(--ink-soft);
      line-height: 1.45;
    }

    .transport {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0 14px 14px;
    }

    .transport button,
    .timeline button,
    .state-buttons button,
    .symbol,
    .hook-button,
    .practice button {
      border: 1px solid rgba(21, 25, 19, 0.18);
      background: rgba(255, 253, 246, 0.78);
      cursor: pointer;
      transition:
        background 160ms ease,
        color 160ms ease,
        border-color 160ms ease,
        transform 160ms ease;
    }

    .transport button {
      min-height: 38px;
      padding: 0 12px;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .transport button:hover,
    .timeline button:hover,
    .state-buttons button:hover,
    .symbol:hover,
    .hook-button:hover,
    .practice button:hover {
      border-color: var(--neutral);
      transform: translateY(-1px);
    }

    .transport button[aria-current="true"],
    .state-buttons button[aria-current="true"] {
      background: var(--neutral);
      color: var(--paper);
    }

    .timeline {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
      border-top: 1px solid rgba(21, 25, 19, 0.12);
      padding: 12px 14px 14px;
    }

    .timeline button {
      min-height: 58px;
      padding: 9px;
      text-align: left;
    }

    .timeline button[aria-current="true"] {
      background: linear-gradient(90deg, rgba(8, 122, 138, 0.16), rgba(255, 253, 246, 0.9));
      border-color: rgba(8, 122, 138, 0.44);
    }

    .timeline span {
      display: block;
      color: var(--ink-soft);
      font-size: 10px;
      font-weight: 800;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .timeline strong {
      display: block;
      font-size: 12px;
      line-height: 1.25;
    }

    .control-panel {
      display: grid;
      align-content: start;
      gap: 0;
      min-width: 0;
    }

    .panel-block {
      border-bottom: 1px solid rgba(21, 25, 19, 0.12);
      padding: 15px;
    }

    .panel-block:last-child {
      border-bottom: 0;
    }

    .panel-block h3 {
      margin: 0 0 10px;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 24px;
      line-height: 1;
      letter-spacing: 0;
    }

    .panel-block p {
      margin: 0;
      color: var(--ink-soft);
      font-size: 13px;
      line-height: 1.45;
    }

    .range-field {
      display: grid;
      gap: 8px;
    }

    .range-field span {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--neutral);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    input[type="range"] {
      width: 100%;
      accent-color: var(--agent);
    }

    .state-buttons,
    .practice {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
      margin-top: 12px;
    }

    .state-buttons button,
    .practice button {
      min-height: 38px;
      padding: 7px 8px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .symbols,
    .hooks {
      display: grid;
      gap: 8px;
    }

    .symbol,
    .hook-button {
      width: 100%;
      min-height: 54px;
      padding: 10px;
      text-align: left;
    }

    .symbol[aria-current="true"],
    .hook-button[aria-current="true"] {
      border-color: var(--highlight);
      background: rgba(224, 179, 45, 0.16);
    }

    .symbol-role {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      color: var(--ink-soft);
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .dot {
      width: 9px;
      height: 9px;
      border: 1px solid rgba(21, 25, 19, 0.24);
      border-radius: 50%;
      background: var(--role-color);
    }

    .symbol strong,
    .hook-button strong {
      display: block;
      color: var(--neutral);
      font-size: 13px;
      line-height: 1.25;
    }

    .symbol small,
    .hook-button small {
      display: block;
      margin-top: 3px;
      color: var(--ink-soft);
      font-size: 11px;
      line-height: 1.35;
    }

    .practice {
      grid-template-columns: 1fr 1fr;
    }

    .practice-feedback {
      min-height: 42px;
      margin-top: 10px !important;
      color: var(--neutral) !important;
    }

    footer {
      margin-top: 14px;
      color: var(--ink-soft);
      font-size: 11px;
      line-height: 1.4;
    }

    @keyframes load-in {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes canvas-in {
      from { opacity: 0; transform: translateY(10px) scale(0.99); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 1ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 1ms !important;
      }
    }

    @media (max-width: 860px) {
      .artifact-hero,
      .artifact-grid {
        grid-template-columns: minmax(0, 1fr);
      }

      .source-chip {
        width: max-content;
        text-align: left;
      }

      .stage {
        min-height: 590px;
      }

      .metric-row {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 560px) {
      .shell {
        width: min(calc(100vw - 20px), 320px);
      }

      h1 {
        font-size: clamp(30px, 10vw, 42px);
      }

      .lede {
        font-size: 15px;
      }

      .stage-top {
        display: grid;
        gap: 6px;
      }

      .source-chip {
        max-width: 100%;
        white-space: normal;
      }

      .canvas-wrap {
        margin: 10px;
      }

      .transport,
      .timeline {
        padding-right: 10px;
        padding-left: 10px;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="artifact-hero">
      <div>
        <p class="eyebrow" id="eyebrow"></p>
        <h1 id="title"></h1>
        <p class="lede" id="mechanism"></p>
      </div>
      <div class="source-chip" id="source"></div>
    </header>

    <section class="artifact-grid">
      <article class="stage">
        <div class="stage-top">
          <div class="counter" id="counter"></div>
          <div class="stage-title" id="stage-title"></div>
        </div>
        <div class="canvas-wrap">
          <canvas id="scene" role="img" aria-label="${title} animated interactive simulation"></canvas>
          <div class="metric-row">
            <div class="metric"><strong id="metric-signal">0%</strong>Effective signal</div>
            <div class="metric"><strong id="metric-state">Baseline</strong>Probe state</div>
            <div class="metric"><strong id="metric-step">1</strong>Storyboard beat</div>
          </div>
        </div>
        <div class="caption" id="caption">
          <h2 id="caption-title"></h2>
          <p id="caption-copy"></p>
        </div>
        <div class="transport">
          <button id="back" type="button">Back</button>
          <button id="next" type="button">Next</button>
          <button id="restart" type="button">Restart</button>
          <button id="auto" type="button">Auto</button>
          <button id="motion" type="button">Pause motion</button>
        </div>
        <div class="timeline" id="steps"></div>
      </article>

      <aside class="control-panel">
        <div class="panel-block">
          <h3>Probe</h3>
          <label class="range-field">
            <span>Input strength <output id="strength-out">55%</output></span>
            <input id="probe" type="range" min="0" max="100" value="55" />
          </label>
          <div class="state-buttons" aria-label="Probe state">
            <button id="state-baseline" type="button" aria-current="true">Baseline</button>
            <button id="state-change" type="button">Change</button>
            <button id="state-compare" type="button">Compare</button>
          </div>
        </div>

        <div class="panel-block">
          <h3>Symbols</h3>
          <div class="symbols" id="symbols"></div>
        </div>

        <div class="panel-block">
          <h3>States</h3>
          <div class="hooks" id="hooks"></div>
        </div>

        <div class="panel-block">
          <h3>Quick practice</h3>
          <p id="practice-prompt"></p>
          <div class="practice">
            <button id="practice-agent" type="button"></button>
            <button id="practice-resolution" type="button"></button>
          </div>
          <p class="practice-feedback" id="practice-feedback"></p>
        </div>

        <div class="panel-block">
          <h3>Principle</h3>
          <p id="principle"></p>
        </div>
      </aside>
    </section>

    <footer id="footer"></footer>
  </main>

  <script>
    const spec = ${data};
    const roleNames = ${JSON.stringify(roleLabels)};
    const roleColors = {
      problem: "#c84a36",
      agent: "#087a8a",
      resolution: "#58a58f",
      neutral: "#151913",
      highlight: "#e0b32d",
      good: "#207857",
      paper: "#fff8ea",
      paperStrong: "#fffdf6",
      rule: "#cabf9e",
      inkSoft: "#626b5f"
    };

    let stepIndex = 0;
    let probeValue = 55;
    let stateMode = "baseline";
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
    const probeInput = document.getElementById("probe");
    const strengthOut = document.getElementById("strength-out");
    const practiceFeedback = document.getElementById("practice-feedback");

    function rand() {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function compact(value, max) {
      return value.length <= max ? value : value.slice(0, max - 1).trim() + "…";
    }

    function stateMultiplier() {
      if (stateMode === "change") return 1.22;
      if (stateMode === "compare") return 1.42;
      return 1;
    }

    function activeBoost() {
      return (0.74 + probeValue / 100) * stateMultiplier() * (selectedHook >= 0 ? 1.16 : 1);
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
      document.getElementById("eyebrow").textContent = spec.subject;
      document.getElementById("source").textContent = spec.source_ref;
      document.getElementById("title").textContent = spec.topic;
      document.getElementById("mechanism").textContent = spec.mechanism;
      document.getElementById("principle").textContent = spec.transferable_principle;
      document.getElementById("footer").textContent = "Sandboxed self-contained HTML. Use arrow keys to step, Space for auto-play, R to restart.";
    }

    function renderSteps() {
      stepsEl.replaceChildren();
      spec.steps.forEach(function(step, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("aria-current", index === stepIndex ? "true" : "false");
        button.addEventListener("click", function() { setStep(index); });
        const count = document.createElement("span");
        count.textContent = "Beat " + String(index + 1).padStart(2, "0");
        const label = document.createElement("strong");
        label.textContent = step.name;
        button.append(count, label);
        stepsEl.append(button);
      });
    }

    function renderSymbols() {
      symbolsEl.replaceChildren();
      spec.key_symbols.forEach(function(symbol, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "symbol";
        button.style.setProperty("--role-color", roleColors[symbol.role] || roleColors.neutral);
        button.setAttribute("aria-current", selectedSymbol === index ? "true" : "false");
        button.addEventListener("click", function() {
          selectedSymbol = selectedSymbol === index ? null : index;
          pulses.push({ x: canvas.clientWidth * 0.5, y: canvas.clientHeight * 0.46, age: 0 });
          renderSymbols();
        });

        const role = document.createElement("span");
        role.className = "symbol-role";
        const dot = document.createElement("span");
        dot.className = "dot";
        const roleText = document.createElement("span");
        roleText.textContent = roleNames[symbol.role] || symbol.role;
        role.append(dot, roleText);

        const name = document.createElement("strong");
        name.textContent = symbol.symbol;
        const meaning = document.createElement("small");
        meaning.textContent = symbol.meaning;
        button.append(role, name, meaning);
        symbolsEl.append(button);
      });
    }

    function renderHooks() {
      hooksEl.replaceChildren();
      if (!spec.interactivity_hooks.length) {
        const note = document.createElement("p");
        note.textContent = "Step through the beats; this artifact does not need an extra state.";
        hooksEl.append(note);
        return;
      }

      spec.interactivity_hooks.slice(0, 5).forEach(function(hook, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "hook-button";
        button.setAttribute("aria-current", selectedHook === index ? "true" : "false");
        button.addEventListener("click", function() {
          selectedHook = selectedHook === index ? -1 : index;
          pulses.push({ x: canvas.clientWidth * 0.5, y: canvas.clientHeight * 0.46, age: 0 });
          renderHooks();
        });
        const label = document.createElement("strong");
        label.textContent = "State " + String(index + 1).padStart(2, "0");
        const copy = document.createElement("small");
        copy.textContent = compact(hook, 118);
        button.append(label, copy);
        hooksEl.append(button);
      });
    }

    function setupPractice() {
      const agent = spec.key_symbols.find(function(symbol) { return symbol.role === "agent"; }) || spec.key_symbols[0];
      const resolution = spec.key_symbols.find(function(symbol) { return symbol.role === "resolution"; }) || spec.key_symbols[spec.key_symbols.length - 1] || agent;

      document.getElementById("practice-prompt").textContent = "Which part should change first if you want the outcome to change?";
      document.getElementById("practice-agent").textContent = compact(agent.symbol, 22);
      document.getElementById("practice-resolution").textContent = compact(resolution.symbol, 22);
      document.getElementById("practice-agent").addEventListener("click", function() {
        practiceFeedback.textContent = "Good. Probe the cause first, then watch how the outcome follows.";
        practiceFeedback.style.color = roleColors.good;
        selectedSymbol = spec.key_symbols.indexOf(agent);
        renderSymbols();
      });
      document.getElementById("practice-resolution").addEventListener("click", function() {
        practiceFeedback.textContent = "Close. The outcome is what you measure after the cause changes.";
        practiceFeedback.style.color = roleColors.problem;
        selectedSymbol = spec.key_symbols.indexOf(resolution);
        renderSymbols();
      });
    }

    function resetParticles() {
      particles.length = 0;
      const width = canvas.clientWidth || 900;
      const height = canvas.clientHeight || 500;
      const count = Math.max(24, Math.min(58, spec.key_symbols.length * 8 + spec.steps.length * 5));
      for (let i = 0; i < count; i += 1) {
        const symbol = spec.key_symbols[i % spec.key_symbols.length] || { role: "neutral", symbol: "particle" };
        const angle = rand() * Math.PI * 2;
        particles.push({
          x: 36 + rand() * Math.max(1, width - 72),
          y: 46 + rand() * Math.max(1, height - 128),
          vx: Math.cos(angle) * (18 + rand() * 36),
          vy: Math.sin(angle) * (18 + rand() * 36),
          r: 5 + rand() * 6,
          role: symbol.role,
          phase: rand() * Math.PI * 2
        });
      }
    }

    function setStep(next) {
      stepIndex = Math.max(0, Math.min(spec.steps.length - 1, next));
      const step = spec.steps[stepIndex];
      document.getElementById("counter").textContent = "Beat " + (stepIndex + 1) + " / " + spec.steps.length;
      document.getElementById("stage-title").textContent = step.name;
      document.getElementById("caption-title").textContent = step.name;
      document.getElementById("caption-copy").textContent = step.beat;
      document.getElementById("metric-step").textContent = String(stepIndex + 1) + " / " + spec.steps.length;
      const activeSymbol = spec.key_symbols[Math.min(stepIndex, spec.key_symbols.length - 1)];
      caption.style.borderLeftColor = activeSymbol ? roleColors[activeSymbol.role] : roleColors.highlight;
      pulses.push({ x: canvas.clientWidth * (0.18 + stepIndex * 0.11), y: canvas.clientHeight * 0.42, age: 0 });
      renderSteps();
    }

    function setStateMode(next) {
      stateMode = next;
      ["baseline", "change", "compare"].forEach(function(mode) {
        document.getElementById("state-" + mode).setAttribute("aria-current", mode === stateMode ? "true" : "false");
      });
      document.getElementById("metric-state").textContent = stateMode.charAt(0).toUpperCase() + stateMode.slice(1);
      pulses.push({ x: canvas.clientWidth * 0.5, y: canvas.clientHeight * 0.46, age: 0 });
    }

    function toggleAuto() {
      const auto = document.getElementById("auto");
      if (autoTimer) {
        clearInterval(autoTimer);
        autoTimer = null;
        auto.textContent = "Auto";
        auto.setAttribute("aria-current", "false");
        return;
      }
      auto.textContent = "Pause";
      auto.setAttribute("aria-current", "true");
      autoTimer = setInterval(function() {
        setStep(stepIndex === spec.steps.length - 1 ? 0 : stepIndex + 1);
      }, 1700);
    }

    function syncMotionButton() {
      motionButton.textContent = motionRunning ? "Pause motion" : "Resume motion";
      motionButton.setAttribute("aria-current", motionRunning ? "false" : "true");
    }

    function drawText(text, x, y, options) {
      const opts = options || {};
      ctx.save();
      ctx.fillStyle = opts.color || roleColors.neutral;
      ctx.font = opts.font || "800 12px Andale Mono, Courier New, monospace";
      ctx.textAlign = opts.align || "left";
      ctx.textBaseline = opts.baseline || "alphabetic";
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
      const width = canvas.clientWidth || 900;
      const height = canvas.clientHeight || 500;
      const delta = Math.min(0.04, Math.max(0.001, (time - lastTime) / 1000 || 0.016));
      lastTime = time;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = roleColors.paperStrong;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(202, 191, 158, 0.46)";
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
      const boost = activeBoost();
      const signal = Math.min(99, Math.round(20 + activeRatio * 38 + probeValue * 0.25 + (boost - 1) * 18));
      document.getElementById("metric-signal").textContent = signal + "%";
      strengthOut.textContent = probeValue + "%";

      particles.forEach(function(particle, index) {
        if (motionRunning) {
          particle.x += particle.vx * delta * boost;
          particle.y += particle.vy * delta * boost;
        }
        if (particle.x < particle.r || particle.x > width - particle.r) particle.vx *= -1;
        if (particle.y < particle.r || particle.y > height - 86 - particle.r) particle.vy *= -1;
        particle.x = clamp(particle.x, particle.r, width - particle.r);
        particle.y = clamp(particle.y, particle.r, height - 86 - particle.r);

        const active = index / particles.length < activeRatio || particle.role === "agent";
        ctx.globalAlpha = active ? 0.86 : 0.23;
        ctx.fillStyle = roleColors[particle.role] || roleColors.neutral;
        ctx.strokeStyle = active ? roleColors.highlight : "rgba(21, 25, 19, 0.36)";
        ctx.lineWidth = active ? 2.4 : 1;
        ctx.beginPath();
        ctx.arc(
          particle.x,
          particle.y,
          particle.r + Math.sin(time * 0.004 + particle.phase) * (motionRunning ? 1.2 : 0.2),
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      const symbolCount = Math.max(1, spec.key_symbols.length);
      const nodes = spec.key_symbols.map(function(symbol, index) {
        const span = Math.max(1, symbolCount - 1);
        const x = 82 + index * ((width - 164) / span);
        const y = height * 0.46 + Math.sin(time * 0.001 + index) * (motionRunning ? 16 : 2);
        return { x: x, y: y, symbol: symbol };
      });

      nodes.forEach(function(node, index) {
        if (index < nodes.length - 1) {
          drawArrow(
            node,
            nodes[index + 1],
            index <= stepIndex ? roleColors.highlight : "rgba(202, 191, 158, 0.72)",
            index <= stepIndex ? 4 : 2
          );
        }
      });

      nodes.forEach(function(node, index) {
        const active = selectedSymbol === index || index <= stepIndex;
        const color = roleColors[node.symbol.role] || roleColors.neutral;
        ctx.fillStyle = active ? "rgba(255, 248, 234, 0.98)" : "rgba(255, 253, 246, 0.72)";
        ctx.strokeStyle = active ? roleColors.highlight : color;
        ctx.lineWidth = active ? 6 : 3;
        ctx.beginPath();
        ctx.arc(node.x, node.y, active ? 44 : 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        drawText(compact(node.symbol.symbol, 14), node.x, node.y + 4, {
          align: "center",
          color: color,
          font: "800 12px Andale Mono, Courier New, monospace"
        });
      });

      if (stateMode === "compare") {
        ctx.save();
        ctx.strokeStyle = "rgba(8, 122, 138, 0.58)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(width * 0.5, 32);
        ctx.lineTo(width * 0.5, height - 92);
        ctx.stroke();
        ctx.restore();
        drawText("baseline", width * 0.25, 30, { align: "center", color: roleColors.inkSoft });
        drawText("probe", width * 0.75, 30, { align: "center", color: roleColors.agent });
      } else {
        drawText(stateMode === "change" ? "changed state" : "baseline state", 18, 30, { color: roleColors.inkSoft });
      }

      const meterWidth = Math.max(120, width * 0.34);
      const meterX = width - meterWidth - 18;
      const meterY = height - 72;
      ctx.fillStyle = "rgba(21, 25, 19, 0.08)";
      ctx.fillRect(meterX, meterY, meterWidth, 16);
      ctx.fillStyle = signal > 72 ? roleColors.good : roleColors.agent;
      ctx.fillRect(meterX, meterY, meterWidth * signal / 100, 16);
      drawText("outcome meter", meterX, meterY - 8, { color: roleColors.inkSoft });

      for (let i = pulses.length - 1; i >= 0; i -= 1) {
        const pulse = pulses[i];
        pulse.age += delta;
        const alpha = 1 - pulse.age / 0.75;
        if (alpha <= 0) {
          pulses.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = roleColors.highlight;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, 12 + pulse.age * 96, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (!document.hidden) scheduleDraw();
    }

    function scheduleDraw() {
      if (animationId === null) {
        animationId = requestAnimationFrame(draw);
      }
    }

    document.getElementById("back").addEventListener("click", function() { setStep(stepIndex - 1); });
    document.getElementById("next").addEventListener("click", function() { setStep(stepIndex + 1); });
    document.getElementById("restart").addEventListener("click", function() { setStep(0); });
    document.getElementById("auto").addEventListener("click", toggleAuto);
    motionButton.addEventListener("click", function() {
      motionRunning = !motionRunning;
      syncMotionButton();
    });
    probeInput.addEventListener("input", function(event) {
      probeValue = Number(event.target.value);
    });
    document.getElementById("state-baseline").addEventListener("click", function() { setStateMode("baseline"); });
    document.getElementById("state-change").addEventListener("click", function() { setStateMode("change"); });
    document.getElementById("state-compare").addEventListener("click", function() { setStateMode("compare"); });

    window.addEventListener("resize", resizeCanvas);
    document.addEventListener("visibilitychange", function() {
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
    document.addEventListener("keydown", function(event) {
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
    renderSteps();
    setupPractice();
    resizeCanvas();
    syncMotionButton();
    setStateMode("baseline");
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
