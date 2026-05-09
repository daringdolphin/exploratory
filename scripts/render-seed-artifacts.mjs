import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const repoRoot = process.cwd();
const builderUrl = pathToFileURL(
  path.join(repoRoot, "src/lib/artifacts/builder-agent.ts"),
).href;
const schemaUrl = pathToFileURL(
  path.join(repoRoot, "src/lib/artifacts/schema.ts"),
).href;

const { buildArtifactHtml } = await import(builderUrl);
const { artifactSpecSchema } = await import(schemaUrl);

async function renderManifest(manifestPath) {
  const absoluteManifestPath = path.resolve(manifestPath);
  const manifestDir = path.dirname(absoluteManifestPath);
  const manifest = JSON.parse(await readFile(absoluteManifestPath, "utf8"));
  const specs = manifest.artifacts || [];

  if (!Array.isArray(specs) || specs.length === 0) {
    console.log(`no artifacts in ${path.relative(repoRoot, absoluteManifestPath)}`);
    return;
  }

  for (const rawSpec of specs) {
    const spec = artifactSpecSchema.parse(rawSpec);
    const relativeOutputPath =
      rawSpec.file_path || path.join("artifacts", spec.output_filename);
    const absoluteOutputPath = path.join(manifestDir, relativeOutputPath);
    const html = buildArtifactHtml(spec);
    validateGeneratedArtifactHtml(spec, html);
    await mkdir(path.dirname(absoluteOutputPath), { recursive: true });
    await writeFile(absoluteOutputPath, html, "utf8");
    console.log(`rendered ${path.relative(repoRoot, absoluteOutputPath)}`);
  }
}

function validateGeneratedArtifactHtml(spec, html) {
  const checks = [
    {
      ok: html.includes("height: 100vh"),
      message: "artifact shell must lock to one viewport with height: 100vh",
    },
    {
      ok: html.includes("overflow: hidden"),
      message: "artifact document must hide overflow to avoid scrolling",
    },
    {
      ok: html.includes('sandbox') === false,
      message: "artifact HTML should not know about parent iframe sandboxing",
    },
    {
      ok: !html.includes("successful collisions flash"),
      message: "old generic collision renderer text leaked into artifact",
    },
    {
      ok: !html.includes("initial gradient = rate"),
      message: "old generic rate renderer text leaked into artifact",
    },
    {
      ok: html.includes("function drawDomainScene()"),
      message: "shared artifact builder dispatch is missing",
    },
  ];

  const failed = checks.find((check) => !check.ok);
  if (failed) {
    throw new Error(`${spec.id}: ${failed.message}`);
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
