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
  beat: z.string().min(1).max(240),
});

export const artifactSymbolSchema = z.object({
  symbol: z.string().min(1).max(56),
  role: semanticRoleSchema,
  meaning: z.string().min(1).max(220),
});

export const artifactMetadataSchema = z.object({
  title: z.string().min(1).max(120),
  subject: z.string().min(1).max(80),
  level: z.string().min(1).max(80),
  syllabus_reference: z.string().min(1).max(160),
  estimated_interaction_time_minutes: z.number().int().min(2).max(45),
  prerequisite_concepts: z.array(z.string().min(1).max(80)).max(8),
});

export const targetMisconceptionSchema = z.object({
  misconception: z.string().min(8).max(220),
  correction: z.string().min(8).max(260),
  addressed_in_scenario_id: z.string().min(1).max(80),
});

export const learningDesignSchema = z.object({
  core_aha: z
    .string()
    .min(16)
    .max(320)
    .describe(
      "The single target realization: after interacting with this, the student should understand that ...",
    ),
  learning_objectives: z.array(z.string().min(8).max(220)).min(1).max(5),
  target_misconceptions: z.array(targetMisconceptionSchema).max(5),
});

export const representationViewSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_-]*$/),
  type: z.enum(["microscopic", "macroscopic", "symbolic"]),
  description: z.string().min(12).max(420),
});

export const representationsSchema = z.object({
  description: z.string().min(12).max(320),
  views: z.array(representationViewSchema).min(3).max(5),
});

const controlValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export const artifactControlSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9][a-z0-9_-]*$/),
    label: z.string().min(1).max(96),
    type: z.enum(["slider", "toggle", "discrete", "select", "stepper"]),
    min: z.number().optional(),
    max: z.number().optional(),
    default: controlValueSchema,
    step: z.number().positive().optional(),
    options: z.array(z.string().min(1).max(80)).optional(),
    affects: z.array(z.string().min(1).max(80)).min(1).max(8),
  })
  .superRefine((control, ctx) => {
    if (
      (control.type === "slider" || control.type === "stepper") &&
      (typeof control.min !== "number" || typeof control.max !== "number")
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Slider and stepper controls require min and max values.",
      });
    }

    if (
      (control.type === "discrete" || control.type === "select") &&
      (!control.options || control.options.length < 2)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Discrete and select controls require at least two options.",
      });
    }
  });

export const artifactScenarioSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_-]*$/),
  title: z.string().min(1).max(120),
  guiding_question: z.string().min(12).max(360),
  locked_controls: z.array(z.string().min(1).max(80)).max(12),
  active_controls: z.array(z.string().min(1).max(80)).max(12),
  success_criterion: z.string().min(12).max(360).optional(),
  prompt_after: z.string().min(12).max(360).optional(),
  misconception_buster: z.boolean().optional(),
});

const checkpointBaseSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_-]*$/),
  after_scenario: z.string().min(1).max(80),
  prompt: z.string().min(12).max(420),
});

export const fillBlankCheckpointSchema = checkpointBaseSchema.extend({
  type: z.literal("fill_in_blank"),
  answers: z.array(z.string().min(1).max(80)).min(1).max(6),
});

export const matchingCheckpointSchema = checkpointBaseSchema.extend({
  type: z.literal("matching"),
  pairs: z
    .array(
      z.object({
        factor: z.string().min(1).max(96),
        mechanism: z.string().min(4).max(180),
      }),
    )
    .min(2)
    .max(6),
});

export const multipleChoiceCheckpointSchema = checkpointBaseSchema.extend({
  type: z.literal("multiple_choice"),
  options: z.array(z.string().min(1).max(140)).min(2).max(5),
  answer: z.string().min(1).max(140),
});

export const checkpointSchema = z.discriminatedUnion("type", [
  fillBlankCheckpointSchema,
  matchingCheckpointSchema,
  multipleChoiceCheckpointSchema,
]);

export const uiRequirementsSchema = z.object({
  always_visible: z.array(z.string().min(1).max(80)).min(1).max(8),
  syllabus_vocabulary_to_surface: z
    .array(z.string().min(1).max(80))
    .min(1)
    .max(12),
  tone: z.string().min(8).max(180),
  accessibility: z.array(z.string().min(1).max(120)).min(1).max(8),
});

export const artifactSpecSchema = z
  .object({
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
      .max(80)
      .describe("The single concept this artifact teaches."),
    medium: z
      .literal("interactive_html")
      .describe(
        "Always interactive_html; rendered through build_artifact/buildArtifact as self-contained iframe-safe HTML.",
      ),
    mechanism: z
      .string()
      .min(12)
      .max(360)
      .describe(
        "One causal-chain sentence. Default to animated canvas when the mechanism involves motion, collision, rate, flow, growth, decay, state change, or a changing parameter.",
      ),
    transferable_principle: z
      .string()
      .min(12)
      .max(320)
      .describe("The generalisable idea the student can transfer."),
    steps: z
      .array(artifactStepSchema)
      .min(3)
      .max(5)
      .describe(
        "3-5 visual beats. Keep these compatible with chat fallback, but use scenarios for the actual teaching sequence.",
      ),
    key_symbols: z
      .array(artifactSymbolSchema)
      .min(1)
      .max(10)
      .describe("Visual elements with semantic roles from the shared palette."),
    interactivity_hooks: z
      .array(z.string().min(1).max(180))
      .max(8)
      .describe(
        "Legacy-compatible summary of meaningful controls/probes. Real interaction is specified in controls/scenarios.",
      ),
    output_filename: z
      .string()
      .min(6)
      .max(100)
      .regex(/\.html$/)
      .describe("HTML filename rendered by build_artifact."),
    artifact_metadata: artifactMetadataSchema,
    learning_design: learningDesignSchema,
    representations: representationsSchema,
    controls: z.array(artifactControlSchema).min(1).max(8),
    scenarios: z.array(artifactScenarioSchema).min(1).max(5),
    checkpoints: z.array(checkpointSchema).min(1).max(5),
    ui_requirements: uiRequirementsSchema,
  })
  .superRefine((spec, ctx) => {
    const controlIds = new Set(spec.controls.map((control) => control.id));
    const scenarioIds = new Set(spec.scenarios.map((scenario) => scenario.id));
    const representationTypes = new Set(
      spec.representations.views.map((view) => view.type),
    );

    for (const type of ["microscopic", "macroscopic", "symbolic"] as const) {
      if (!representationTypes.has(type)) {
        ctx.addIssue({
          code: "custom",
          path: ["representations", "views"],
          message: `Artifacts must include a ${type} representation.`,
        });
      }
    }

    for (const scenario of spec.scenarios) {
      for (const controlId of [
        ...scenario.locked_controls,
        ...scenario.active_controls,
      ]) {
        if (!controlIds.has(controlId)) {
          ctx.addIssue({
            code: "custom",
            path: ["scenarios", scenario.id],
            message: `Scenario references unknown control '${controlId}'.`,
          });
        }
      }
    }

    for (const misconception of spec.learning_design.target_misconceptions) {
      if (!scenarioIds.has(misconception.addressed_in_scenario_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["learning_design", "target_misconceptions"],
          message: `Misconception references unknown scenario '${misconception.addressed_in_scenario_id}'.`,
        });
      }
    }

    for (const checkpoint of spec.checkpoints) {
      if (!scenarioIds.has(checkpoint.after_scenario)) {
        ctx.addIssue({
          code: "custom",
          path: ["checkpoints", checkpoint.id],
          message: `Checkpoint references unknown scenario '${checkpoint.after_scenario}'.`,
        });
      }
    }
  });

export type SemanticRole = z.infer<typeof semanticRoleSchema>;
export type ArtifactStep = z.infer<typeof artifactStepSchema>;
export type ArtifactSymbol = z.infer<typeof artifactSymbolSchema>;
export type ArtifactMetadata = z.infer<typeof artifactMetadataSchema>;
export type TargetMisconception = z.infer<typeof targetMisconceptionSchema>;
export type LearningDesign = z.infer<typeof learningDesignSchema>;
export type RepresentationView = z.infer<typeof representationViewSchema>;
export type ArtifactControl = z.infer<typeof artifactControlSchema>;
export type ArtifactScenario = z.infer<typeof artifactScenarioSchema>;
export type ArtifactCheckpoint = z.infer<typeof checkpointSchema>;
export type ArtifactSpec = z.infer<typeof artifactSpecSchema>;

export type BuiltArtifact = ArtifactSpec & {
  html: string;
  created_at?: string;
  generated_from?: string;
};
