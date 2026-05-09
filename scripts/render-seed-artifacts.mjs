import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";

const repoRoot = process.cwd();
const rendererUrl = pathToFileURL(
  path.join(repoRoot, "src/lib/artifacts/renderer.ts"),
).href;
const schemaUrl = pathToFileURL(
  path.join(repoRoot, "src/lib/artifacts/schema.ts"),
).href;

const { buildArtifactHtml } = await import(rendererUrl);
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
    await mkdir(path.dirname(absoluteOutputPath), { recursive: true });
    await writeFile(absoluteOutputPath, buildArtifactHtml(spec), "utf8");
    console.log(`rendered ${path.relative(repoRoot, absoluteOutputPath)}`);
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
