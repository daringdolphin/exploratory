import atomicManifest from "../../seed/generated/o_level_chem_atomic_structure_seeded/manifest.json";
import rateManifest from "../../seed/generated/o_level_chem_rate_of_reaction_seeded/manifest.json";
import { buildArtifact } from "@/lib/artifacts/renderer";
import {
  artifactSpecSchema,
  type ArtifactSpec,
  type BuiltArtifact,
} from "@/lib/artifacts/schema";

export type ArtifactRecord = BuiltArtifact & {
  origin: "seed" | "generated";
  noteSetId: string;
};

export type NotePage = {
  page_number: number;
  title: string;
  kind?: string;
  has_artifacts: boolean;
  artifact_ids: string[];
};

export type NoteSet = {
  id: string;
  title: string;
  subject: string;
  sourceFile: string;
  sourcePath: string;
  summary: string;
  pages: NotePage[];
  artifacts: ArtifactRecord[];
};

type SeedManifest = {
  notes: {
    id: string;
    title: string;
    subject: string;
    source_file: string;
    total_pages: number;
    total_artifacts: number;
  };
  pages: NotePage[];
  artifacts: Array<ArtifactSpec & { file_path?: string }>;
};

type BundleConfig = {
  id: string;
  title: string;
  summary: string;
  sourceFile: string;
  sourcePath: string;
  manifest: SeedManifest;
};

const bundleConfigs: BundleConfig[] = [
  {
    id: "rate-of-reaction",
    title: "Rate of Reaction",
    summary:
      "Animated and interactive notes about reaction rate, collision theory, concentration, pressure, temperature, and catalysts.",
    sourceFile: "[O LEVEL CHEMISTRY] Rate of Reaction - demo.pdf",
    sourcePath: "seed/[O LEVEL CHEMISTRY] Rate of Reaction - demo.pdf",
    manifest: rateManifest as SeedManifest,
  },
  {
    id: "atomic-structure",
    title: "Atomic Structure",
    summary:
      "Particle-level notes about atomic structure, ions, charge, isotope reasoning, and worked notation questions.",
    sourceFile: "[O LEVEL CHEMISTRY] Atomic Structure - demo.pdf",
    sourcePath: "seed/[O LEVEL CHEMISTRY] Atomic Structure - demo.pdf",
    manifest: atomicManifest as SeedManifest,
  },
];

function toSchemaArtifact(artifact: ArtifactSpec & { file_path?: string }) {
  return artifactSpecSchema.parse({
    ...artifact,
    interactivity_hooks: artifact.interactivity_hooks
      .slice(0, 5)
      .map((hook) =>
        hook.length > 140 ? `${hook.slice(0, 137)}...` : hook,
      ),
  });
}

function makeArtifacts({
  id: noteSetId,
  manifest,
}: BundleConfig): ArtifactRecord[] {
  return manifest.artifacts.map((artifact) => {
    const spec = toSchemaArtifact(artifact);
    const built = buildArtifact(spec);

    return {
      ...built,
      origin: "seed" as const,
      noteSetId,
    };
  });
}

function makeNoteSet(config: BundleConfig): NoteSet {
  return {
    id: config.id,
    title: config.title,
    subject: config.manifest.notes.subject,
    sourceFile: config.sourceFile,
    sourcePath: config.sourcePath,
    summary: config.summary,
    pages: config.manifest.pages.map((page) => ({
      page_number: page.page_number,
      title: page.title,
      kind: page.kind,
      has_artifacts: page.has_artifacts,
      artifact_ids: page.artifact_ids,
    })),
    artifacts: makeArtifacts(config),
  };
}

export const noteSets: NoteSet[] = bundleConfigs.map(makeNoteSet);

export function getNoteSetById(id: string) {
  return noteSets.find((noteSet) => noteSet.id === id) ?? null;
}

export function getArtifactById(id: string) {
  for (const noteSet of noteSets) {
    const artifact = noteSet.artifacts.find((item) => item.id === id);
    if (artifact) {
      return artifact;
    }
  }

  return null;
}

export function getAllSeedArtifacts() {
  return noteSets.flatMap((noteSet) => noteSet.artifacts);
}
