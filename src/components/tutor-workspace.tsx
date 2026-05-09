"use client";

import { useChat } from "@ai-sdk/react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronRight,
  FileText,
  FlaskConical,
  Gauge,
  Layers3,
  Loader2,
  MessageSquareText,
  PanelLeft,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { ArtifactRecord, NoteSet } from "@/lib/seed-data";
import type { BuiltArtifact } from "@/lib/artifacts/schema";

type GeneratedArtifact = BuiltArtifact & {
  origin: "generated";
  noteSetId: string;
};

type TutorWorkspaceProps = {
  noteSets: NoteSet[];
};

type ArtifactToolPart = UIMessage["parts"][number] & {
  type: "tool-buildArtifact";
  state?:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error"
    | "output-denied";
  input?: Partial<BuiltArtifact>;
  output?: BuiltArtifact;
  errorText?: string;
};

type LearningPlan = {
  concepts: Array<{
    label: string;
    sourceRef: string;
    role: string;
  }>;
  outcomes: string[];
  storyboard: Array<{
    id: string;
    topic: string;
    sourceRef: string;
    mechanism: string;
    outcome: string;
    origin: "seed" | "generated";
  }>;
};

const suggestedPrompts = [
  "Turn this note set into a 5-minute learning path.",
  "Give me a quick practice check for the current artifact.",
  "Create a follow-up artifact with a slider.",
];

const chatTransport = new DefaultChatTransport<UIMessage>({
  api: "/api/chat",
});

export function TutorWorkspace({ noteSets }: TutorWorkspaceProps) {
  const [selectedNoteId, setSelectedNoteId] = useState(noteSets[0]?.id ?? "");
  const [selectedArtifactId, setSelectedArtifactId] = useState(
    noteSets[0]?.artifacts[0]?.id ?? "",
  );
  const [input, setInput] = useState("");
  const deferredInput = useDeferredValue(input);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const selectedNote =
    noteSets.find((noteSet) => noteSet.id === selectedNoteId) ?? noteSets[0];

  const { messages, sendMessage, status, stop, error } = useChat<UIMessage>({
    transport: chatTransport,
  });

  const generatedArtifacts = useMemo(
    () => extractGeneratedArtifacts(messages, selectedNote?.id ?? ""),
    [messages, selectedNote?.id],
  );

  const artifacts = useMemo(() => {
    const seeded = selectedNote?.artifacts ?? [];
    const generated = generatedArtifacts.filter(
      (artifact) => artifact.noteSetId === selectedNote?.id,
    );
    return [...seeded, ...generated];
  }, [generatedArtifacts, selectedNote]);

  const selectedArtifact =
    artifacts.find((artifact) => artifact.id === selectedArtifactId) ??
    artifacts[0];

  const learningPlan = useMemo(
    () => buildLearningPlan(artifacts),
    [artifacts],
  );

  const selectedStoryboardIndex = Math.max(
    0,
    learningPlan.storyboard.findIndex(
      (beat) => beat.id === selectedArtifact?.id,
    ),
  );
  const canSend = deferredInput.trim().length > 0 && status === "ready";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const chatContext = () => ({
    noteSetId: selectedNote?.id,
    artifactId: selectedArtifact?.id,
    generatedArtifacts: generatedArtifacts.map(toArtifactSpec),
  });

  async function submitMessage(text: string) {
    const next = text.trim();
    if (!next || status !== "ready") return;

    setInput("");
    await sendMessage(
      { text: next },
      {
        body: chatContext(),
      },
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(input);
  }

  function selectNote(noteSet: NoteSet) {
    startTransition(() => {
      setSelectedNoteId(noteSet.id);
      setSelectedArtifactId(noteSet.artifacts[0]?.id ?? "");
    });
  }

  function selectArtifact(artifactId: string) {
    startTransition(() => {
      setSelectedArtifactId(artifactId);
    });
  }

  function openGeneratedArtifact(artifact: BuiltArtifact) {
    selectArtifact(artifact.id);
  }

  if (!selectedNote || !selectedArtifact) {
    return (
      <main className="empty-state">
        <p>No seeded notes found.</p>
      </main>
    );
  }

  return (
    <main className="learning-app">
      <div className="atmosphere" aria-hidden="true" />
      <section className="theater-shell" aria-label="Chemistry tutor studio">
        <header className="theater-header">
          <div className="brand-lockup">
            <p className="studio-kicker">
              <FlaskConical aria-hidden="true" />
              Chemistry Tutor Studio
            </p>
            <h1>{selectedNote.title}</h1>
            <p>{selectedNote.summary}</p>
          </div>

          <nav className="note-switcher" aria-label="Choose note set">
            {noteSets.map((noteSet) => (
              <button
                aria-current={noteSet.id === selectedNote.id}
                className="note-tab"
                key={noteSet.id}
                onClick={() => selectNote(noteSet)}
                type="button"
              >
                <BookOpen aria-hidden="true" />
                <span>{noteSet.title}</span>
              </button>
            ))}
          </nav>
        </header>

        <section className="composition-grid" aria-label="Learning workspace">
          <aside className="story-panel" aria-label="Storyboard learning path">
            <div className="panel-heading">
              <p className="panel-kicker">
                <Layers3 aria-hidden="true" />
                Storyboard
              </p>
              <h2>Concepts to artifact flow</h2>
              <p>
                Key concepts and outcomes are extracted from the note set, then
                ordered as a guided run of core artifacts.
              </p>
            </div>

            <div className="concept-stack" aria-label="Key concepts">
              {learningPlan.concepts.map((concept, index) => (
                <div className="concept-row" key={`${concept.label}-${index}`}>
                  <span className="concept-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{concept.label}</strong>
                    <small>{concept.sourceRef}</small>
                  </span>
                </div>
              ))}
            </div>

            <div className="outcome-panel">
              <p className="mini-heading">
                <Target aria-hidden="true" />
                Learning outcomes
              </p>
              <div className="outcome-list">
                {learningPlan.outcomes.map((outcome, index) => (
                  <p key={`${outcome}-${index}`}>
                    <CheckCircle2 aria-hidden="true" />
                    <span>{outcome}</span>
                  </p>
                ))}
              </div>
            </div>

            <div className="flow-shell">
              <p className="mini-heading">
                <Gauge aria-hidden="true" />
                Core artifact flow
              </p>
              <div className="flow-list">
                {learningPlan.storyboard.map((beat, index) => (
                  <button
                    aria-current={beat.id === selectedArtifact.id}
                    className="flow-beat"
                    key={beat.id}
                    onClick={() => selectArtifact(beat.id)}
                    type="button"
                  >
                    <span className="flow-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flow-copy">
                      <strong>{beat.topic}</strong>
                      <small>{compactText(beat.mechanism, 102)}</small>
                    </span>
                    {beat.origin === "generated" ? (
                      <Sparkles aria-hidden="true" />
                    ) : (
                      <ChevronRight aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <details className="source-pages">
              <summary>
                <PanelLeft aria-hidden="true" />
                Source pages
              </summary>
              <div>
                {selectedNote.pages.map((page) => (
                  <p key={page.page_number}>
                    <span>{String(page.page_number).padStart(2, "0")}</span>
                    <span>{page.title}</span>
                  </p>
                ))}
              </div>
            </details>
          </aside>

          <section className="artifact-theater" aria-label="Interactive artifact">
            <div className="stage-toolbar">
              <div>
                <p className="panel-kicker">
                  <Play aria-hidden="true" />
                  Core artifact {selectedStoryboardIndex + 1} of{" "}
                  {learningPlan.storyboard.length}
                </p>
                <h2>{selectedArtifact.topic}</h2>
              </div>
              <div className="stage-actions">
                <span>{selectedArtifact.source_ref}</span>
                <a
                  href={`/api/source/${selectedNote.id}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <FileText aria-hidden="true" />
                  Open notes
                </a>
              </div>
            </div>

            <div className="artifact-frame-wrap">
              <iframe
                className="artifact-frame"
                sandbox="allow-scripts"
                srcDoc={selectedArtifact.html}
                title={`${selectedArtifact.topic} artifact`}
              />
            </div>

            <div className="artifact-brief">
              <p>
                <strong>Mechanism</strong>
                {selectedArtifact.mechanism}
              </p>
              <p>
                <strong>Transfer</strong>
                {selectedArtifact.transferable_principle}
              </p>
            </div>
          </section>

          <aside className="coach-panel" aria-label="Chat tutor">
            <div className="coach-header">
              <div>
                <p className="panel-kicker">
                  <Sparkles aria-hidden="true" />
                  Tutor thread
                </p>
                <h2>Probe the artifact</h2>
              </div>
              {status === "streaming" || status === "submitted" ? (
                <button className="icon-text-button" onClick={stop} type="button">
                  <RotateCcw aria-hidden="true" />
                  Stop
                </button>
              ) : null}
            </div>

            <p className="coach-context">
              Current context: <strong>{selectedArtifact.topic}</strong>
            </p>

            <div className="chat-scroll">
              {messages.length === 0 ? (
                <div className="prompt-slate">
                  <div>
                    <Sparkles aria-hidden="true" />
                    <strong>Start with the artifact on screen</strong>
                  </div>
                  <div className="prompt-list">
                    {suggestedPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => void submitMessage(prompt)}
                        type="button"
                      >
                        <span>{prompt}</span>
                        <ArrowRight aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="message-list">
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onOpenArtifact={openGeneratedArtifact}
                  />
                ))}
                {status === "submitted" ? (
                  <div className="thinking-row">
                    <Loader2 aria-hidden="true" />
                    Thinking through the mechanism...
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
            </div>

            {error ? <div className="chat-error">{error.message}</div> : null}

            <form className="composer" onSubmit={handleSubmit}>
              <textarea
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitMessage(input);
                  }
                }}
                placeholder="Ask for a mechanism, comparison, or practice check..."
                value={input}
              />
              <button disabled={!canSend} title="Send" type="submit">
                <Send aria-hidden="true" />
              </button>
            </form>
          </aside>
        </section>

        <section className="source-dock" aria-label="Original document">
          <div className="source-dock-header">
            <div>
              <p className="panel-kicker">
                <FileText aria-hidden="true" />
                Original document
              </p>
              <h2>{selectedNote.sourceFile}</h2>
            </div>
            <a
              href={`/api/source/${selectedNote.id}`}
              rel="noreferrer"
              target="_blank"
            >
              Open PDF
            </a>
          </div>
          <iframe
            loading="lazy"
            src={`/api/source/${selectedNote.id}`}
            title={`${selectedNote.title} source PDF`}
          />
        </section>
      </section>
    </main>
  );
}

function ChatMessage({
  message,
  onOpenArtifact,
}: {
  message: UIMessage;
  onOpenArtifact: (artifact: BuiltArtifact) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`chat-row ${isUser ? "is-user" : "is-agent"}`}>
      {!isUser ? (
        <div className="chat-avatar">
          <Bot aria-hidden="true" />
        </div>
      ) : null}

      <div className="chat-bubble">
        {message.parts.map((part, index) => (
          <MessagePart
            key={`${message.id}-${index}`}
            onOpenArtifact={onOpenArtifact}
            part={part}
          />
        ))}
      </div>

      {isUser ? (
        <div className="chat-avatar user-avatar">
          <User aria-hidden="true" />
        </div>
      ) : null}
    </div>
  );
}

function MessagePart({
  part,
  onOpenArtifact,
}: {
  part: UIMessage["parts"][number];
  onOpenArtifact: (artifact: BuiltArtifact) => void;
}) {
  if (part.type === "text") {
    return <p className="message-copy">{part.text}</p>;
  }

  if (isBuildArtifactPart(part)) {
    if (part.state === "input-streaming" || part.state === "input-available") {
      return (
        <div className="artifact-toast">
          <div>
            <Loader2 aria-hidden="true" />
            <strong>Building artifact</strong>
          </div>
          {part.input?.topic ? <p>{part.input.topic}</p> : null}
        </div>
      );
    }

    if (part.state === "output-error") {
      return (
        <div className="artifact-error">
          {part.errorText ?? "The artifact tool failed."}
        </div>
      );
    }

    if (part.state === "output-available" && part.output) {
      return (
        <div className="generated-artifact-card">
          <div className="generated-artifact-header">
            <div>
              <div>
                <MessageSquareText aria-hidden="true" />
                <strong>{part.output.topic}</strong>
              </div>
              <p>{compactText(part.output.mechanism, 132)}</p>
            </div>
            <button
              onClick={() => onOpenArtifact(part.output as BuiltArtifact)}
              type="button"
            >
              Open
            </button>
          </div>
          <iframe
            sandbox="allow-scripts"
            srcDoc={part.output.html}
            title={`${part.output.topic} generated artifact`}
          />
        </div>
      );
    }
  }

  return null;
}

function isBuildArtifactPart(
  part: UIMessage["parts"][number],
): part is ArtifactToolPart {
  return part.type === "tool-buildArtifact";
}

function isBuiltArtifact(value: unknown): value is BuiltArtifact {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BuiltArtifact>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.topic === "string" &&
    typeof candidate.html === "string" &&
    candidate.medium === "interactive_html"
  );
}

function extractGeneratedArtifacts(
  messages: UIMessage[],
  noteSetId: string,
): GeneratedArtifact[] {
  const artifacts: GeneratedArtifact[] = [];

  for (const message of messages) {
    for (const part of message.parts) {
      if (
        isBuildArtifactPart(part) &&
        part.state === "output-available" &&
        isBuiltArtifact(part.output)
      ) {
        artifacts.push({
          ...part.output,
          origin: "generated",
          noteSetId,
        });
      }
    }
  }

  return artifacts;
}

function buildLearningPlan(
  artifacts: Array<ArtifactRecord | GeneratedArtifact>,
): LearningPlan {
  const concepts = artifacts.slice(0, 6).map((artifact) => ({
    label: artifact.topic,
    sourceRef: artifact.source_ref,
    role: artifact.key_symbols[0]?.role ?? "neutral",
  }));

  const outcomes = artifacts
    .slice(0, 4)
    .map((artifact) => compactText(artifact.transferable_principle, 126));

  const storyboard = artifacts.map((artifact) => ({
    id: artifact.id,
    topic: artifact.topic,
    sourceRef: artifact.source_ref,
    mechanism: artifact.mechanism,
    outcome: compactText(artifact.transferable_principle, 110),
    origin: artifact.origin,
  }));

  return { concepts, outcomes, storyboard };
}

function compactText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}…`;
}

function toArtifactSpec(artifact: BuiltArtifact) {
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
  };
}
