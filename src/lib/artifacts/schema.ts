import { z } from "zod";

export const semanticRoleSchema = z.enum([
  "problem",
  "agent",
  "resolution",
  "neutral",
  "highlight",
]);

export const artifactStepSchema = z.object({
  name: z.string().min(1).max(48),
  beat: z.string().min(1).max(220),
});

export const artifactSymbolSchema = z.object({
  symbol: z.string().min(1).max(48),
  role: semanticRoleSchema,
  meaning: z.string().min(1).max(180),
});

export const artifactSpecSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_-]*$/)
    .describe("Stable kebab-style id for this artifact."),
  source_ref: z
    .string()
    .min(1)
    .max(80)
    .describe("Page, question, or follow_up:<parent_id> reference."),
  subject: z.string().min(1).max(80),
  topic: z
    .string()
    .min(1)
    .max(64)
    .describe("The single concept this artifact teaches."),
  medium: z
    .literal("interactive_html")
    .describe(
      "Always interactive_html; rendered through build_artifact/buildArtifact as self-contained iframe-safe HTML.",
    ),
  mechanism: z
    .string()
    .min(12)
    .max(280)
    .describe(
      "One causal-chain sentence. Default to a canvas simulation when the mechanism involves motion, collision, rate, flow, growth, decay, state change, or a changing parameter.",
    ),
  transferable_principle: z
    .string()
    .min(12)
    .max(280)
    .describe("The generalisable idea the student can transfer."),
  steps: z
    .array(artifactStepSchema)
    .min(3)
    .max(5)
    .describe(
      "3-5 visual beats. Each beat should map cleanly to a bounded, deterministic canvas animation state when motion or change is shown, while still making sense as text-only chat context.",
    ),
  key_symbols: z
    .array(artifactSymbolSchema)
    .min(1)
    .max(8)
    .describe("Visual elements with semantic roles from the shared palette."),
  interactivity_hooks: z
    .array(z.string().min(1).max(140))
    .max(5)
    .describe(
      "Bounded, pedagogically meaningful controls such as sliders, state toggles, comparison modes, or quick-practice probes. Leave empty when only step pacing is useful; never add decorative or unbounded interactions.",
    ),
  output_filename: z
    .string()
    .min(6)
    .max(100)
    .regex(/\.html$/)
    .describe("HTML filename rendered by build_artifact."),
});

export type SemanticRole = z.infer<typeof semanticRoleSchema>;
export type ArtifactStep = z.infer<typeof artifactStepSchema>;
export type ArtifactSymbol = z.infer<typeof artifactSymbolSchema>;
export type ArtifactSpec = z.infer<typeof artifactSpecSchema>;

export type BuiltArtifact = ArtifactSpec & {
  html: string;
  created_at?: string;
  generated_from?: string;
};
