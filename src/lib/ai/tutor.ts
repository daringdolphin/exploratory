import {
  ToolLoopAgent,
  gateway,
  stepCountIs,
  tool,
  type InferUITools,
  type ToolSet,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { artifactSpecSchema, type ArtifactSpec } from "@/lib/artifacts/schema";
import { buildArtifact } from "@/lib/artifacts/renderer";
import { getTutorModelId } from "@/lib/ai/gateway-config";
import {
  getAllSeedArtifacts,
  getArtifactById,
  getNoteSetById,
  noteSets,
  type NoteSet,
} from "@/lib/seed-data";

const generatedArtifactContextSchema = artifactSpecSchema
  .extend({
    html: z.string().optional(),
    generated_from: z.string().optional(),
    created_at: z.string().optional(),
  })
  .passthrough();

const tutorRequestSchema = z.object({
  noteSetId: z.string().optional(),
  artifactId: z.string().optional(),
  generatedArtifacts: z.array(generatedArtifactContextSchema).optional(),
});

export type TutorRequestInput = z.infer<typeof tutorRequestSchema>;

export type TutorContext = {
  noteSet: NoteSet | null;
  selectedArtifact: ArtifactSpec | null;
  generatedArtifacts: ArtifactSpec[];
};

export const chatTutorTools = {
  searchSeededArtifacts: tool({
    description:
      "Search the seeded notes and artifacts when the student asks about a topic outside the currently selected artifact.",
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .describe("The concept, page, or mechanism to search for."),
      subject: z.string().optional(),
    }),
    execute: async ({ query }) => {
      const terms = query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      const results = getAllSeedArtifacts()
        .map((artifact) => {
          const haystack = [
            artifact.topic,
            artifact.subject,
            artifact.source_ref,
            artifact.mechanism,
            artifact.transferable_principle,
            artifact.learning_design.core_aha,
            ...artifact.learning_design.learning_objectives,
            ...artifact.learning_design.target_misconceptions.flatMap(
              (item) => [item.misconception, item.correction],
            ),
            ...artifact.controls.map(
              (control) =>
                `${control.label} ${control.affects.join(" ")} ${control.id}`,
            ),
            ...artifact.scenarios.map(
              (scenario) =>
                `${scenario.title} ${scenario.guiding_question} ${
                  scenario.success_criterion ?? ""
                }`,
            ),
            ...artifact.steps.map((step) => `${step.name} ${step.beat}`),
            ...artifact.key_symbols.map(
              (symbol) => `${symbol.symbol} ${symbol.meaning}`,
            ),
          ]
            .join(" ")
            .toLowerCase();

          const score = terms.reduce(
            (total, term) => total + (haystack.includes(term) ? 1 : 0),
            0,
          );

          return { artifact, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(({ artifact }) => ({
          id: artifact.id,
          noteSetId: artifact.noteSetId,
          topic: artifact.topic,
          source_ref: artifact.source_ref,
          mechanism: artifact.mechanism,
          transferable_principle: artifact.transferable_principle,
        }));

      return {
        query,
        results,
        noteSets: noteSets.map((noteSet) => ({
          id: noteSet.id,
          title: noteSet.title,
          summary: noteSet.summary,
        })),
      };
    },
  }),
  buildArtifact: tool({
    description:
      "Create one follow-up interactive HTML teaching artifact when a student needs to predict, test, and connect a causal mechanism across linked representations. Default to animated canvas plus meaningful controls for motion, collisions, rates, particle changes, graph changes, or symbolic transformations.",
    inputSchema: artifactSpecSchema.describe(
      "A complete v2 ArtifactSpec. Fill the learning_design, representations, controls, scenarios, checkpoints, and ui_requirements fields. Scenarios must use predict-then-test, active/locked controls, linked microscopic/macroscopic/symbolic representations, and at least one checkpoint. Keep it self-contained and compatible with sandboxed iframe rendering.",
    ),
    execute: async (spec) => ({
      ...buildArtifact(spec),
      created_at: new Date().toISOString(),
      generated_from: spec.source_ref,
    }),
  }),
} satisfies ToolSet;

export type TutorTools = InferUITools<typeof chatTutorTools>;
export type TutorUIMessage = UIMessage<unknown, never, TutorTools>;

export function parseTutorRequest(input: unknown): TutorRequestInput {
  const result = tutorRequestSchema.safeParse(input);
  return result.success ? result.data : {};
}

export function buildTutorContext(input: TutorRequestInput): TutorContext {
  const noteSet = input.noteSetId ? getNoteSetById(input.noteSetId) : null;
  const generatedArtifacts =
    input.generatedArtifacts?.map((artifact) => toArtifactSpec(artifact)) ?? [];
  const selectedArtifact = input.artifactId
    ? getArtifactById(input.artifactId) ??
      generatedArtifacts.find((artifact) => artifact.id === input.artifactId) ??
      null
    : null;

  return {
    noteSet,
    selectedArtifact: selectedArtifact ? toArtifactSpec(selectedArtifact) : null,
    generatedArtifacts,
  };
}

export function createTutorAgent(context: TutorContext) {
  const model = gateway(getTutorModelId());

  return new ToolLoopAgent({
    id: "chat-tutor",
    model,
    instructions: buildInstructions(context),
    tools: chatTutorTools,
    stopWhen: stepCountIs(6),
  });
}

function toArtifactSpec(artifact: ArtifactSpec): ArtifactSpec {
  return {
    id: artifact.id,
    source_ref: artifact.source_ref,
    subject: artifact.subject,
    topic: artifact.topic,
    medium: artifact.medium,
    mechanism: artifact.mechanism,
    transferable_principle: artifact.transferable_principle,
    steps: artifact.steps,
    key_symbols: artifact.key_symbols,
    interactivity_hooks: artifact.interactivity_hooks,
    output_filename: artifact.output_filename,
    artifact_metadata: artifact.artifact_metadata,
    learning_design: artifact.learning_design,
    representations: artifact.representations,
    controls: artifact.controls,
    scenarios: artifact.scenarios,
    checkpoints: artifact.checkpoints,
    ui_requirements: artifact.ui_requirements,
  };
}

function buildInstructions(context: TutorContext) {
  return `You are the Chat Tutor agent for an O Level Chemistry learning app.

Your job is to help a student understand the notes and seeded explainer artifacts. You can answer directly in text, or call buildArtifact to create a follow-up interactive artifact that the webapp can render.

Shared pedagogy:
- Teaching design comes before rendering. For every artifact, first decide the core_aha, target misconceptions, linked representations, constrained scenarios, and checkpoint; then encode those in the schema.
- When notes are ingested or a note set is planned, extract key concepts, write concrete learning outcomes, and storyboard the learning path before creating individual artifacts.
- Treat the core artifact flow like a storyboarding exercise: each artifact is one visual beat in a sequence that moves from concrete observation to mechanism to transferable exam reasoning.
- Show the mechanism, never just the conclusion.
- Teach one concept per artifact.
- Use concrete particle-level reasoning before formulas or symbols.
- Keep artifact steps as 3-5 visual beats, not paragraphs.
- Use semantic roles consistently: problem, agent, resolution, neutral, highlight.
- Use predict-then-test: scenarios should ask for a prediction before controls become active.
- Use multiple linked representations: microscopic, macroscopic, and symbolic views should all change in response to the same control.
- Use constrained exploration before free play. Prefer 2-4 deliberate scenarios with locked controls over an open sandbox.
- Surface at least one misconception when the topic has a known trap, and include a checkpoint that makes the student articulate the mechanism.
- Honor O-Level/MOE vocabulary exactly when relevant.
- Do not invent a mechanism when the source context is too thin. Say what is known, narrow the scope, or ask the student for the relevant note page.

When asked to ingest, map, plan, or rebuild notes:
- First return a compact plan with three sections: Key concepts, Learning outcomes, Core artifact flow.
- Key concepts should be the smallest mechanism-bearing ideas worth teaching, not every noun from the notes.
- Learning outcomes should use observable verbs such as explain, predict, compare, trace, classify, or apply.
- Core artifact flow should order artifacts as storyboard beats. Name the artifact, the mechanism it reveals, the input/probe a student can manipulate, and the outcome they should notice.
- Only call buildArtifact after the storyboard says a specific beat needs an interactive artifact.

When to answer in text:
- Definitions, quick checks, simple misconceptions, or requests for a short explanation.
- Use short paragraphs and ask at most one useful follow-up question.

When to call buildArtifact:
- The student asks "show me", "make an artifact", "visualize", "compare", "why does X change Y", or seems stuck on a causal chain.
- The answer depends on a mechanism, worked example, comparison, or parameter change that benefits from interaction.

Artifact rules:
- medium must be "interactive_html".
- id should be kebab-style and source_ref should be "follow_up:<parent_id>" when it follows the selected artifact.
- output_filename must end in .html.
- artifact_metadata should match the current note set and O-Level context.
- learning_design.core_aha must be a crisp one-sentence target realization.
- representations.views must include microscopic, macroscopic, and symbolic views. Describe what each view makes visible.
- controls must be bounded and meaningful. Use sliders, toggles, discrete controls, selects, or steppers only when changing them tests the scenario question.
- scenarios must include guiding_question, active_controls, locked_controls, and success_criterion. Put free play last only after constrained scenarios.
- checkpoints should be fill_in_blank, matching, or multiple_choice, and should follow a scenario where the student has enough evidence to answer.
- ui_requirements.syllabus_vocabulary_to_surface should list the exact exam vocabulary the artifact should scaffold.
- Use the same house style through the buildArtifact tool. Do not write HTML in your message and do not inject arbitrary React, DOM, scripts, or styles outside the tool.
- Canvas-first default: when the mechanism involves motion, collision, rate, flow, growth, decay, state change, or a parameter changing an outcome, shape the ArtifactSpec so buildArtifact/build_artifact renders an animated canvas simulation rather than a static SVG-style diagram.
- Static or mostly static visuals are acceptable only when motion would not add understanding, such as a pure label map, classification, or short symbolic worked example. Do not use static SVG as the default for mechanisms that unfold over time.
- Keep the simulation bounded and pedagogically meaningful: one concept, deterministic/reproducible motion as much as practical, 3-5 visible states, and controls that answer a student question rather than adding decorative motion. Prefer sliders, state toggles, compare modes, and quick-practice checks when they let the student probe cause and effect.
- Preserve chat-window compatibility: the mechanism, transferable_principle, steps, key_symbols, interactivity_hooks, scenarios, and checkpoints must carry the explanation even if the iframe/canvas is unavailable. Never make motion the only source of meaning.
- Chat rendering safety: artifacts are self-contained HTML for a sandboxed iframe using sandbox="allow-scripts" without allow-same-origin. They must not rely on remote scripts/assets, cookies, storage, parent page access, popups, navigation, network calls, or unbounded JavaScript.
- Animation expectations for rendered artifacts: use requestAnimationFrame for motion, respect prefers-reduced-motion, pause when the document is hidden, and keep CPU/work per frame small.

Current app context:
${JSON.stringify(toTutorPromptContext(context), null, 2)}

Available seeded note sets:
${JSON.stringify(
  noteSets.map((noteSet) => ({
    id: noteSet.id,
    title: noteSet.title,
    summary: noteSet.summary,
    pages: noteSet.pages,
    artifactTopics: noteSet.artifacts.map((artifact) => ({
      id: artifact.id,
      topic: artifact.topic,
      mechanism: artifact.mechanism,
    })),
  })),
  null,
  2,
)}`;
}

function toTutorPromptContext(context: TutorContext) {
  return {
    noteSet: context.noteSet
      ? {
          id: context.noteSet.id,
          title: context.noteSet.title,
          subject: context.noteSet.subject,
          summary: context.noteSet.summary,
          pages: context.noteSet.pages,
          keyConcepts: context.noteSet.artifacts.map((artifact) => ({
            topic: artifact.topic,
            source_ref: artifact.source_ref,
          })),
          learningOutcomes: context.noteSet.artifacts
            .slice(0, 8)
            .flatMap((artifact) => artifact.learning_design.learning_objectives)
            .slice(0, 8),
          coreArtifactFlow: context.noteSet.artifacts.map((artifact) => ({
            id: artifact.id,
            topic: artifact.topic,
            source_ref: artifact.source_ref,
            core_aha: artifact.learning_design.core_aha,
            mechanism: artifact.mechanism,
            transferable_principle: artifact.transferable_principle,
            target_misconceptions:
              artifact.learning_design.target_misconceptions.map(
                (item) => item.misconception,
              ),
            scenarios: artifact.scenarios.map((scenario) => ({
              id: scenario.id,
              title: scenario.title,
              guiding_question: scenario.guiding_question,
              active_controls: scenario.active_controls,
            })),
            controls: artifact.controls.map((control) => ({
              id: control.id,
              label: control.label,
              affects: control.affects,
            })),
          })),
        }
      : null,
    selectedArtifact: context.selectedArtifact,
    generatedArtifacts: context.generatedArtifacts,
  };
}
