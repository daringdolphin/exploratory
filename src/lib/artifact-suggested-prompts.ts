import type { BuiltArtifact } from "@/lib/artifacts/schema";

/** Short stems for when no artifact is focused; each ≤10 words (see {@link MAX_WORDS}). */
export const FALLBACK_SUGGESTED_PROMPTS = [
  "What's the main idea in plain words?",
  "I thought the opposite—is that wrong?",
  "How do I tell these two ideas apart?",
  "Why does this step actually work?",
  "What wrong answer would tempt me here?",
  "How does this link to earlier topics?",
  "Quick check: do I actually get this?",
];

const MAX_PROMPTS = 8;
/** UI cap for “Ask or generate from here” chips. */
export const MAX_WORDS = 10;

/** Chip label: first {@link MAX_WORDS} words; appends … when shortened. */
export function truncateWords(text: string, maxWords = MAX_WORDS): string {
  const t = text.trim();
  if (!t) return t;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return t;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function lowerKey(text: string): string {
  return text.trim().toLowerCase().slice(0, 96);
}

/**
 * Builds student-voiced suggested chat prompts from {@link BuiltArtifact} / ArtifactSpec fields.
 */
export function buildSuggestedPromptsFromArtifact(
  artifact: BuiltArtifact,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  function push(...candidates: (string | undefined)[]) {
    for (const raw of candidates) {
      if (out.length >= MAX_PROMPTS) return;
      if (!raw) continue;
      const line = raw.trim();
      const key = lowerKey(line);
      if (key.length < 8 || seen.has(key)) continue;
      seen.add(key);
      out.push(line);
    }
  }

  const topic = artifact.topic?.trim();
  const ld = artifact.learning_design;

  if (ld?.target_misconceptions?.length) {
    for (const m of ld.target_misconceptions) {
      const mis = m.misconception?.trim();
      if (mis) {
        push(
          `I keep thinking “${mis}”—what’s wrong with that picture?`,
          `Is it okay to assume ${mis.charAt(0).toLowerCase()}${mis.slice(1)}?`,
        );
      }
    }
  }

  const firstScenario = artifact.scenarios?.[0];
  if (firstScenario?.guiding_question?.trim()) {
    push(firstScenario.guiding_question.trim());
  }

  if (topic) {
    push(`What should I be able to explain about “${topic}” after this?`);
  }

  if (ld?.core_aha?.trim()) {
    push(
      `Is the main thing I’m meant to realize really: ${ld.core_aha.trim()}`,
    );
  }

  const mechanism = artifact.mechanism?.trim();
  if (mechanism) {
    push(`Why does this happen, step by step? (${mechanism})`);
  }

  if (ld?.learning_objectives?.length) {
    for (const obj of ld.learning_objectives.slice(0, 2)) {
      if (obj?.trim()) {
        push(`How would I prove I understand this: ${obj.trim()}?`);
      }
    }
  }

  const sym = artifact.key_symbols?.[0];
  if (sym?.symbol && sym?.meaning) {
    push(
      `What does ${sym.symbol} mean here, in plain English (${sym.meaning})?`,
    );
  }

  const prereq = artifact.artifact_metadata?.prerequisite_concepts?.[0];
  if (prereq?.trim()) {
    push(`I’m fuzzy on “${prereq.trim()}”—how does it connect to this activity?`);
  }

  const transferable = artifact.transferable_principle?.trim();
  if (transferable) {
    push(`Where else in exams could I apply this idea: ${transferable}?`);
  }

  const checkpoint = artifact.checkpoints?.[0];
  if (checkpoint?.prompt?.trim()) {
    push(`Help me think through this without spoiling it: ${checkpoint.prompt.trim()}`);
  }

  if (artifact.scenarios && artifact.scenarios.length > 1) {
    const s2 = artifact.scenarios[1]?.guiding_question?.trim();
    if (s2) push(s2);
  }

  return out;
}
