import { Output, ToolLoopAgent, gateway, stepCountIs, tool } from "ai";
import { z } from "zod";
import {
  artifactMetadataSchema,
  artifactSpecSchema,
  type ArtifactSpec,
} from "@/lib/artifacts/schema";
import { getTutorModelId } from "@/lib/ai/gateway-config";

const MAX_NOTES_CHARACTERS = 120_000;

const uploadedNotesFileSchema = z.object({
  filename: z.string().min(1).max(180),
  mediaType: z.string().min(1).max(120),
  dataUrl: z.string().min(1),
  size: z.number().int().nonnegative().optional(),
});

export const notesIngestionRequestSchema = z
  .object({
    title: z.string().min(1).max(160).optional(),
    subject: z.string().min(1).max(80).default("Chemistry"),
    level: z.string().min(1).max(80).default("Secondary 4 (O-Level)"),
    syllabusReference: z
      .string()
      .min(1)
      .max(180)
      .default("MOE 6092 Chemistry"),
    sourceName: z.string().min(1).max(180).optional(),
    notes: z.string().max(MAX_NOTES_CHARACTERS).optional(),
    focus: z.string().min(1).max(500).optional(),
    maxArtifacts: z.number().int().min(1).max(8).default(4),
    file: uploadedNotesFileSchema.optional(),
  })
  .refine((input) => input.notes?.trim() || input.file, {
    message: "Provide notes text or an uploaded file.",
    path: ["notes"],
  });

export type NotesIngestionRequest = z.infer<typeof notesIngestionRequestSchema>;
export type UploadedNotesFile = z.infer<typeof uploadedNotesFileSchema>;

const sourceEvidenceSchema = z.object({
  reference: z
    .string()
    .min(1)
    .max(120)
    .describe("Page, heading, quote fragment, or local source reference."),
  note: z
    .string()
    .min(8)
    .max(260)
    .describe("Why this source evidence matters for the artifact spec."),
});

const misconceptionCandidateSchema = z.object({
  misconception: z.string().min(8).max(220),
  correction: z.string().min(8).max(260),
  artifact_id: z.string().min(1).max(80),
});

const keyConceptSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_-]*$/),
  concept: z.string().min(4).max(120),
  why_it_matters: z.string().min(12).max(320),
  source_refs: z.array(z.string().min(1).max(120)).min(1).max(8),
  core_aha: z.string().min(16).max(320),
  prerequisite_concepts: z.array(z.string().min(1).max(80)).max(8),
});

const artifactFlowStepSchema = z.object({
  artifact_id: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  mechanism: z.string().min(12).max(360),
  student_probe: z.string().min(8).max(240),
  expected_aha: z.string().min(16).max(320),
  sequence_reason: z.string().min(12).max(260),
});

const artifactHandoffSchema = z.object({
  artifact_id: z.string().min(1).max(80),
  priority: z.enum(["must_build", "should_build", "nice_to_have"]),
  builder_brief: z
    .string()
    .min(20)
    .max(600)
    .describe(
      "Implementation-facing brief for the artifact builder. Explain what must be visible and manipulable.",
    ),
  source_evidence: z.array(sourceEvidenceSchema).min(1).max(6),
  spec: artifactSpecSchema,
});

export const notesIngestionOutputSchema = z.object({
  artifact_metadata: artifactMetadataSchema,
  source_summary: z.string().min(20).max(1_000),
  key_concepts: z.array(keyConceptSchema).min(1).max(12),
  learning_outcomes: z.array(z.string().min(8).max(220)).min(1).max(12),
  core_artifact_flow: z.array(artifactFlowStepSchema).min(1).max(8),
  target_misconception_map: z.array(misconceptionCandidateSchema).max(12),
  artifact_handoffs: z.array(artifactHandoffSchema).min(1).max(8),
  notes_for_builder_agent: z.array(z.string().min(8).max(260)).max(8),
  source_limitations: z.array(z.string().min(8).max(260)).max(6),
});

export type NotesIngestionOutput = z.infer<typeof notesIngestionOutputSchema>;

export type ArtifactSpecAssessment = {
  spec_id: string;
  ready_for_builder: boolean;
  issues: string[];
  warnings: string[];
  covered_principles: string[];
};

const scopeCheckSchema = z.object({
  topic: z.string().min(1).max(120),
  core_aha: z.string().min(12).max(320),
  learning_objectives: z.array(z.string().min(8).max(220)).min(1).max(5),
  target_misconceptions: z
    .array(
      z.object({
        misconception: z.string().min(8).max(220),
        correction: z.string().min(8).max(260),
      }),
    )
    .max(5),
});

export const notesIngestionTools = {
  checkArtifactScope: tool({
    description:
      "Check whether a planned artifact is focused enough before drafting the full ArtifactSpec.",
    inputSchema: scopeCheckSchema,
    execute: async (scope) => {
      const issues: string[] = [];
      const warnings: string[] = [];

      if (scope.topic.split(/\s+/).length > 10) {
        warnings.push("Topic may be too broad for one interactive artifact.");
      }

      if (scope.learning_objectives.length > 3) {
        warnings.push(
          "More than three objectives often means the artifact is carrying too much.",
        );
      }

      if (!/\bwhy\b|\bhow\b|\bwhen\b|\bcauses?\b|\bmeans?\b/i.test(scope.core_aha)) {
        warnings.push(
          "Core aha should name a causal mechanism, not just a fact to remember.",
        );
      }

      if (scope.target_misconceptions.length === 0) {
        warnings.push(
          "Consider adding a misconception if the notes contain a common exam trap.",
        );
      }

      return {
        ready_to_draft: issues.length === 0,
        issues,
        warnings,
      };
    },
  }),
  validateArtifactSpec: tool({
    description:
      "Validate one ArtifactSpec for pedagogy before handing it to the artifact builder. This does not render HTML.",
    inputSchema: artifactSpecSchema,
    execute: async (spec) => assessArtifactSpec(spec),
  }),
};

export function createNotesIngestionAgent() {
  return new ToolLoopAgent({
    id: "notes-ingestion",
    model: gateway(getTutorModelId()),
    instructions: NOTES_INGESTION_SYSTEM_PROMPT,
    tools: notesIngestionTools,
    output: Output.object({
      schema: notesIngestionOutputSchema,
      name: "notes_artifact_spec_handoff",
      description:
        "A notes ingestion result containing scoped learning concepts and builder-ready ArtifactSpecs.",
    }),
    stopWhen: stepCountIs(12),
  });
}

export async function ingestNotesToArtifactSpecs(input: NotesIngestionRequest) {
  const agent = createNotesIngestionAgent();

  const result = await agent.generate({
    messages: [
      {
        role: "user",
        content: buildNotesMessageContent(input),
      },
    ],
    timeout: { totalMs: 120_000 },
  });

  const output = result.output;
  const assessments = output.artifact_handoffs.map((handoff) =>
    assessArtifactSpec(handoff.spec),
  );

  return {
    ...output,
    artifact_specs: output.artifact_handoffs.map((handoff) => handoff.spec),
    assessments,
    usage: result.totalUsage,
    warnings: result.warnings,
  };
}

export function assessArtifactSpec(
  spec: ArtifactSpec,
): ArtifactSpecAssessment {
  const issues: string[] = [];
  const warnings: string[] = [];
  const coveredPrinciples: string[] = [];
  const representationTypes = new Set(
    spec.representations.views.map((view) => view.type),
  );
  const scenarioControlIds = new Set(
    spec.scenarios.flatMap((scenario) => scenario.active_controls),
  );

  if (spec.topic.length <= 80 && spec.learning_design.core_aha.length <= 320) {
    coveredPrinciples.push("one concept with a crisp core aha");
  }

  if (
    representationTypes.has("microscopic") &&
    representationTypes.has("macroscopic") &&
    representationTypes.has("symbolic")
  ) {
    coveredPrinciples.push("multiple linked representations");
  } else {
    issues.push(
      "Spec must include microscopic, macroscopic, and symbolic representations.",
    );
  }

  if (
    spec.scenarios.some((scenario) =>
      /\bpredict\b|\bbefore\b|\bwhat will happen\b/i.test(
        scenario.guiding_question,
      ),
    )
  ) {
    coveredPrinciples.push("predict-then-test scenario design");
  } else {
    issues.push(
      "At least one scenario should ask for a prediction before students manipulate controls.",
    );
  }

  if (spec.scenarios.some((scenario) => scenario.locked_controls.length > 0)) {
    coveredPrinciples.push("constrained exploration");
  } else {
    warnings.push(
      "All scenarios are fully open; add locked controls before free play when possible.",
    );
  }

  if (spec.learning_design.target_misconceptions.length > 0) {
    coveredPrinciples.push("misconception surfaced");

    const hasBusterScenario = spec.scenarios.some(
      (scenario) => scenario.misconception_buster,
    );

    if (!hasBusterScenario) {
      warnings.push(
        "Target misconceptions are listed, but no scenario is marked as a misconception buster.",
      );
    }
  } else {
    warnings.push(
      "No target misconception is listed. Confirm that this topic has no useful misconception to surface.",
    );
  }

  if (spec.checkpoints.length > 0) {
    coveredPrinciples.push("checkpoint articulation moment");
  } else {
    issues.push("Spec needs at least one checkpoint.");
  }

  for (const control of spec.controls) {
    if (!scenarioControlIds.has(control.id)) {
      warnings.push(
        `Control '${control.id}' is never active in a scenario, so it may be decorative.`,
      );
    }
  }

  if (
    spec.ui_requirements.syllabus_vocabulary_to_surface.some((term) =>
      /\bcollision\b|\bactivation energy\b|\beffective\b|\binitial rate\b/i.test(
        term,
      ),
    )
  ) {
    coveredPrinciples.push("syllabus vocabulary surfaced");
  }

  return {
    spec_id: spec.id,
    ready_for_builder: issues.length === 0,
    issues,
    warnings,
    covered_principles: coveredPrinciples,
  };
}

function buildNotesMessageContent(input: NotesIngestionRequest) {
  const text = buildNotesIngestionUserPrompt(input);
  const content: Array<
    | { type: "text"; text: string }
    | {
        type: "file";
        data: string;
        filename: string;
        mediaType: string;
      }
  > = [{ type: "text", text }];

  if (input.file) {
    content.push({
      type: "file",
      data: input.file.dataUrl,
      filename: input.file.filename,
      mediaType: input.file.mediaType,
    });
  }

  return content;
}

function buildNotesIngestionUserPrompt(input: NotesIngestionRequest) {
  const notes = input.notes?.trim()
    ? truncateNotes(input.notes.trim())
    : "(Notes are attached as an uploaded file.)";

  return `Ingest these notes and produce builder-ready interactive artifact specs.

Context:
- Title: ${input.title ?? input.sourceName ?? "Uploaded notes"}
- Source name: ${input.sourceName ?? input.file?.filename ?? "Uploaded notes"}
- Subject: ${input.subject}
- Level: ${input.level}
- Syllabus reference: ${input.syllabusReference}
- Focus, if any: ${input.focus ?? "Use the strongest teachable mechanisms in the notes."}
- Maximum artifacts to hand off: ${input.maxArtifacts}

Uploaded notes:
${notes}

Return no more than ${input.maxArtifacts} artifact_handoffs. Prefer fewer, stronger artifacts over a broad list.`;
}

function truncateNotes(notes: string) {
  if (notes.length <= MAX_NOTES_CHARACTERS) {
    return notes;
  }

  return `${notes.slice(0, MAX_NOTES_CHARACTERS)}

[Truncated after ${MAX_NOTES_CHARACTERS} characters. Use source_limitations to note any missing context.]`;
}

const NOTES_INGESTION_SYSTEM_PROMPT = `You are the Notes Ingestion Agent for an O-Level learning artifact pipeline.

Your job is to read uploaded student notes or PDFs and produce artifact specifications for a separate artifact-building agent. You do not render HTML. You do not write UI code. You only return structured planning output and ArtifactSpec objects that satisfy the app schema.

Pedagogical contract:
- One concept per artifact. Every spec must answer: "After interacting with this, the student should feel that ___." Put that answer in learning_design.core_aha.
- Make the invisible visible and manipulable. For chemistry, expose the particle, energy, bond, or causal layer that students cannot directly see.
- Use predict-then-test. Scenarios should ask students to predict before changing controls.
- Use multiple linked representations. Each artifact should include microscopic, macroscopic, and symbolic views, and all should respond to the same meaningful controls.
- Constrain exploration before free play. Prefer 2-4 deliberate scenarios with locked controls, then optional free play last.
- Surface misconceptions. Include at least one interaction that breaks a specific misconception when the notes imply one.
- Honor syllabus vocabulary. Use the exact exam language students need, such as collision frequency, successful collision, effective collision, activation energy, initial rate, ion, isotope, proton number, nucleon number, oxidation, reduction, or other source-specific vocabulary.
- Keep UI cognitive load low. Controls must be plainly labelled and pedagogically necessary.
- Include a checkpoint where the student articulates the mechanism.

Workflow:
1. Extract the smallest mechanism-bearing key concepts from the notes. Do not list every noun.
2. Choose the few concepts that genuinely benefit from interaction.
3. For each candidate, call checkArtifactScope before drafting the full spec.
4. Draft ArtifactSpec objects that can be handed to the artifact builder.
5. Call validateArtifactSpec for each drafted spec before final output.
6. Return structured output matching notesIngestionOutputSchema.

ArtifactSpec requirements:
- medium must be "interactive_html".
- id must be stable kebab-case.
- source_ref should cite a page, heading, section, or uploaded source reference when available.
- output_filename must end in ".html".
- representations.views must include microscopic, macroscopic, and symbolic.
- controls must be bounded and must exist because they test a scenario question.
- scenarios must include guiding_question, active_controls, locked_controls, and success_criterion where useful.
- checkpoints must be fill_in_blank, matching, or multiple_choice.
- ui_requirements.syllabus_vocabulary_to_surface must list exact vocabulary from the syllabus/notes.

Quality bar:
- Do not invent facts beyond the notes. If the source is thin, narrow the artifact or note the limitation.
- Prefer causal mechanisms over decorative animations.
- Prefer one excellent artifact over many shallow ones.
- Builder briefs should explain what the artifact builder must make visible, what students manipulate, and what should update in linked representations.`;
