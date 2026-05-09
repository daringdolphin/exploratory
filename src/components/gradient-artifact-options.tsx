"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type OptionId = "lens" | "compare" | "scrub" | "predict" | "build";

type Option = {
  id: OptionId;
  name: string;
  thesis: string;
  aha: string;
};

const options: Option[] = [
  {
    id: "lens",
    name: "Slope Lens",
    thesis: "One graph. One movable tangent.",
    aha: "Rate is steepness at that moment.",
  },
  {
    id: "compare",
    name: "Steep vs Flat",
    thesis: "Compare two moments, then choose the faster one.",
    aha: "The steeper line is the faster reaction.",
  },
  {
    id: "scrub",
    name: "Time Scrub",
    thesis: "Drag through the reaction and watch the rate fade.",
    aha: "Rate falls as the graph flattens.",
  },
  {
    id: "predict",
    name: "Predict First",
    thesis: "Commit to a prediction, then reveal the tangent.",
    aha: "Initial rate means the starting gradient.",
  },
  {
    id: "build",
    name: "Build the Graph",
    thesis: "Change collision pace and see the graph draw itself.",
    aha: "More frequent successful collisions make a steeper graph.",
  },
];

export function GradientArtifactOptions() {
  return (
    <main className="test-artifact-page">
      <header className="test-artifact-topbar">
        <div>
          <p>Rate of Reaction / Prototype Test</p>
          <h1>Measuring Rate From Gradient</h1>
        </div>
        <p className="test-artifact-note">
          Five simple directions. Each keeps one aha, one visual, one action.
        </p>
      </header>

      <section className="test-options-grid" aria-label="Five artifact options">
        {options.map((option, index) => (
          <article className="option-card" key={option.id}>
            <header className="option-card-header">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{option.name}</h2>
                <p>{option.aha}</p>
              </div>
            </header>
            <div className="option-card-body">
              {option.id === "lens" ? <SlopeLens /> : null}
              {option.id === "compare" ? <SteepVsFlat /> : null}
              {option.id === "scrub" ? <TimeScrub /> : null}
              {option.id === "predict" ? <PredictFirst /> : null}
              {option.id === "build" ? <BuildGraph /> : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function SlopeLens() {
  const [time, setTime] = useState(12);
  const rate = rateAt(time);

  return (
    <div className="simple-artifact option-lens">
      <GraphCanvas mode="lens" rate={rate} time={time} />
      <aside className="simple-panel">
        <Metric label="rate" value={`${rate.toFixed(1)}x`} />
        <label className="clean-slider">
          <span>Move the tangent</span>
          <input
            max="92"
            min="8"
            onChange={(event) => setTime(Number(event.target.value))}
            type="range"
            value={time}
          />
        </label>
        <p>The reaction is fastest where the curve is steepest.</p>
      </aside>
    </div>
  );
}

function SteepVsFlat() {
  const [choice, setChoice] = useState<"early" | "late" | null>(null);
  const correct = choice === "early";

  return (
    <div className="simple-artifact option-compare">
      <div className="split-graphs">
        <MiniGraph label="Early" rate={1.8} selected={choice === "early"} />
        <MiniGraph label="Late" rate={0.4} selected={choice === "late"} />
      </div>
      <aside className="simple-panel">
        <p className="prompt">Which part shows the faster reaction?</p>
        <div className="choice-row">
          <button
            aria-pressed={choice === "early"}
            onClick={() => setChoice("early")}
            type="button"
          >
            Early
          </button>
          <button
            aria-pressed={choice === "late"}
            onClick={() => setChoice("late")}
            type="button"
          >
            Late
          </button>
        </div>
        <p className={choice ? (correct ? "feedback good" : "feedback") : ""}>
          {choice
            ? correct
              ? "Yes. Steeper gradient means faster rate."
              : "Not quite. Look for the steeper gradient."
            : "Choose before the answer appears."}
        </p>
      </aside>
    </div>
  );
}

function TimeScrub() {
  const [time, setTime] = useState(18);
  const rate = rateAt(time);
  const stage = time < 34 ? "fast start" : time < 68 ? "slowing" : "almost flat";

  return (
    <div className="simple-artifact option-scrub">
      <GraphCanvas mode="scrub" rate={rate} time={time} />
      <div className="bottom-controls">
        <Metric label={stage} value={`${rate.toFixed(1)}x`} />
        <label className="clean-slider">
          <span>Reaction time</span>
          <input
            max="92"
            min="8"
            onChange={(event) => setTime(Number(event.target.value))}
            type="range"
            value={time}
          />
        </label>
      </div>
    </div>
  );
}

function PredictFirst() {
  const [prediction, setPrediction] = useState<"start" | "middle" | "end" | null>(
    null,
  );
  const revealed = prediction !== null;
  const time = prediction === "middle" ? 48 : prediction === "end" ? 86 : 12;
  const rate = rateAt(time);

  return (
    <div className="simple-artifact option-predict">
      <GraphCanvas mode={revealed ? "lens" : "hidden"} rate={rate} time={time} />
      <aside className="simple-panel">
        <p className="prompt">Predict: where is the initial rate read?</p>
        <div className="choice-row stacked">
          <button onClick={() => setPrediction("start")} type="button">
            Start
          </button>
          <button onClick={() => setPrediction("middle")} type="button">
            Middle
          </button>
          <button onClick={() => setPrediction("end")} type="button">
            End
          </button>
        </div>
        <p className={revealed ? "feedback good" : ""}>
          {revealed
            ? prediction === "start"
              ? "Correct. Initial rate is the starting gradient."
              : "Initial rate is taken at the start, before reactants are used up."
            : "The tangent appears after you choose."}
        </p>
      </aside>
    </div>
  );
}

function BuildGraph() {
  const [collisions, setCollisions] = useState(52);
  const rate = 0.45 + collisions / 38;

  return (
    <div className="simple-artifact option-build">
      <ParticleGraph rate={rate} collisions={collisions} />
      <aside className="simple-panel">
        <Metric label="initial gradient" value={`${rate.toFixed(1)}x`} />
        <label className="clean-slider">
          <span>Successful collisions</span>
          <input
            max="95"
            min="20"
            onChange={(event) => setCollisions(Number(event.target.value))}
            type="range"
            value={collisions}
          />
        </label>
        <p>More successful collisions per second draw a steeper graph.</p>
      </aside>
    </div>
  );
}

function GraphCanvas({
  mode,
  rate,
  time,
}: {
  mode: "lens" | "scrub" | "hidden";
  rate: number;
  time: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animation = 0;
    let frame = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      frame += 1;

      drawGraphBase(ctx, rect.width, rect.height);
      drawCurve(ctx, rect.width, rect.height, "#087a8a", 5);

      const progress = time / 100;
      const point = curvePoint(rect.width, rect.height, progress);

      ctx.fillStyle = "#d79d1f";
      ctx.beginPath();
      ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
      ctx.fill();

      if (mode !== "hidden") {
        drawTangent(ctx, point.x, point.y, rate, mode === "scrub" ? 92 : 120);
        drawText(ctx, "gradient = rate", point.x + 18, point.y - 18, "#151913");
      }

      for (let index = 0; index < Math.round(5 + rate * 5); index += 1) {
        const phase = (frame * 0.014 * rate + index * 0.17) % 1;
        const particle = curvePoint(rect.width, rect.height, phase);
        ctx.fillStyle = index % 2 ? "rgba(8,122,138,.38)" : "rgba(215,157,31,.42)";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      animation = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animation);
  }, [mode, rate, time]);

  return <canvas className="clean-graph" ref={canvasRef} />;
}

function MiniGraph({
  label,
  rate,
  selected,
}: {
  label: string;
  rate: number;
  selected: boolean;
}) {
  return (
    <div className={selected ? "mini-graph selected" : "mini-graph"}>
      <span>{label}</span>
      <GraphCanvas mode="lens" rate={rate} time={label === "Early" ? 14 : 76} />
    </div>
  );
}

function ParticleGraph({
  rate,
  collisions,
}: {
  rate: number;
  collisions: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particles = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => ({
        x: ((index * 37) % 100) / 100,
        y: ((index * 53) % 100) / 100,
        phase: index * 0.3,
      })),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animation = 0;
    let frame = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      frame += 1;
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = "#fffdf6";
      ctx.fillRect(0, 0, rect.width, rect.height);

      const split = rect.width * 0.42;
      ctx.strokeStyle = "#d8d2c2";
      ctx.beginPath();
      ctx.moveTo(split, 28);
      ctx.lineTo(split, rect.height - 28);
      ctx.stroke();

      drawText(ctx, "particles", 28, 34, "#626b5f");
      drawText(ctx, "graph", split + 26, 34, "#626b5f");

      const activeCount = Math.round(12 + collisions / 4);
      particles.slice(0, activeCount).forEach((particle, index) => {
        const x =
          28 +
          ((particle.x * (split - 70) + frame * rate * (0.3 + index / 80)) %
            (split - 70));
        const y =
          62 +
          Math.abs(Math.sin(frame * 0.018 * rate + particle.phase)) *
            (rect.height - 124);
        ctx.fillStyle = index % 3 === 0 ? "#d79d1f" : "#087a8a";
        ctx.globalAlpha = index % 3 === 0 ? 0.62 : 0.42;
        ctx.beginPath();
        ctx.arc(x, y, index % 3 === 0 ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      drawGraphBase(ctx, rect.width - split - 34, rect.height - 64, split + 18, 42);
      ctx.save();
      ctx.translate(split + 18, 42);
      drawCurve(ctx, rect.width - split - 34, rect.height - 64, "#087a8a", 5, rate);
      ctx.restore();

      animation = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animation);
  }, [collisions, particles, rate]);

  return <canvas className="clean-graph" ref={canvasRef} />;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="clean-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function rateAt(time: number) {
  return Math.max(0.2, 2.3 * Math.exp(-time / 58));
}

function curvePoint(width: number, height: number, t: number) {
  const marginX = 58;
  const top = 44;
  const bottom = height - 48;
  const x = marginX + t * (width - marginX - 34);
  const y = bottom - (1 - Math.exp(-3.1 * t)) * (bottom - top);
  return { x, y };
}

function drawGraphBase(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  x = 0,
  y = 0,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fffdf6";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#151913";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(58, 32);
  ctx.lineTo(58, height - 48);
  ctx.lineTo(width - 34, height - 48);
  ctx.stroke();
  drawText(ctx, "product", 22, 34, "#626b5f");
  drawText(ctx, "time", width - 72, height - 18, "#626b5f");
  ctx.restore();
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  lineWidth: number,
  rateScale = 1,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (let index = 0; index <= 80; index += 1) {
    const t = index / 80;
    const point = curvePoint(width, height, Math.min(1, t * rateScale * 0.72));
    const x = 58 + t * (width - 92);
    if (index === 0) ctx.moveTo(x, point.y);
    else ctx.lineTo(x, point.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawTangent(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rate: number,
  length: number,
) {
  const angle = -Math.atan(rate * 0.54);
  const dx = Math.cos(angle) * length * 0.5;
  const dy = Math.sin(angle) * length * 0.5;
  ctx.save();
  ctx.strokeStyle = "#d79d1f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - dx, y - dy);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();
  ctx.restore();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = "700 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText(text, x, y);
  ctx.restore();
}
