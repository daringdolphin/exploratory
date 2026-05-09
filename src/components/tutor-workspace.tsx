"use client";

import { useChat } from "@ai-sdk/react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  ChevronRight,
  Compass,
  FileText,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send,
  Sparkles,
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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  buildSuggestedPromptsFromArtifact,
  FALLBACK_SUGGESTED_PROMPTS,
  truncateWords,
} from "@/lib/artifact-suggested-prompts";
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
  storyboard: Array<{
    id: string;
    topic: string;
    origin: "seed" | "generated";
  }>;
};

type ConceptsSidebarMode = "original-notes" | "explore-concepts";

const SHOW_ME_PROMPT =
  "Show me with an interactive artifact based on what I was confused about.";

const chatTransport = new DefaultChatTransport<UIMessage>({
  api: "/api/chat",
});

export function TutorWorkspace({ noteSets }: TutorWorkspaceProps) {
  const [selectedNoteId, setSelectedNoteId] = useState(noteSets[0]?.id ?? "");
  const [conceptsSidebarMode, setConceptsSidebarMode] =
    useState<ConceptsSidebarMode>("explore-concepts");
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

  const suggestedPrompts = useMemo(() => {
    if (conceptsSidebarMode === "explore-concepts" && selectedArtifact) {
      const derived = buildSuggestedPromptsFromArtifact(selectedArtifact);
      return derived.length > 0 ? derived : [...FALLBACK_SUGGESTED_PROMPTS];
    }
    return [...FALLBACK_SUGGESTED_PROMPTS];
  }, [conceptsSidebarMode, selectedArtifact]);

  const pdfSourceUrl = selectedNote
    ? `/api/source/${encodeURIComponent(selectedNote.id)}`
    : "";

  const learningPlan = useMemo(
    () => buildLearningPlan(artifacts),
    [artifacts],
  );

  const canSend = deferredInput.trim().length > 0 && status === "ready";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const chatContext = (options?: {
    showArtifactForMessageId?: string;
    sourceMessageText?: string;
  }) => {
    const selectedArtifactSpec = selectedArtifact
      ? toArtifactSpec(selectedArtifact)
      : undefined;

    return {
      noteSetId: selectedNote?.id,
      artifactId:
        conceptsSidebarMode === "explore-concepts"
          ? selectedArtifact?.id
          : undefined,
      selectedArtifact: selectedArtifactSpec,
      generatedArtifacts: generatedArtifacts.map(toArtifactSpec),
      showArtifactRequest: options?.showArtifactForMessageId
        ? {
            messageId: options.showArtifactForMessageId,
            messageText: options.sourceMessageText,
            sourceArtifact: selectedArtifactSpec,
          }
        : undefined,
    };
  };

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

  async function requestArtifactForMessage(message: UIMessage) {
    if (!selectedArtifact || status !== "ready") return;

    await sendMessage(
      { text: SHOW_ME_PROMPT },
      {
        body: chatContext({
          showArtifactForMessageId: message.id,
          sourceMessageText: getMessageText(message),
        }),
      },
    );
  }

  function selectNote(noteSetId: string) {
    const noteSet = noteSets.find((item) => item.id === noteSetId);
    if (!noteSet) return;

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
    startTransition(() => {
      setConceptsSidebarMode("explore-concepts");
    });
  }

  if (!selectedNote) {
    return (
      <main className="empty-state">
        <p>No seeded notes found.</p>
      </main>
    );
  }

  return (
    <main className="learning-desk">
      <section className="desk-shell" aria-label="Tutor workspace">
        <aside className="chapter-rail" aria-label="Chapter concepts">
          <div className="chapter-picker">
            <label htmlFor="chapter-select">
              <BookOpen aria-hidden="true" />
              Chapter
            </label>
            <select
              id="chapter-select"
              onChange={(event) => selectNote(event.target.value)}
              value={selectedNote.id}
            >
              {noteSets.map((noteSet) => (
                <option key={noteSet.id} value={noteSet.id}>
                  {noteSet.title}
                </option>
              ))}
            </select>
          </div>

          <div
            className="sidebar-view-tabs"
            role="radiogroup"
            aria-label="Notes and concepts"
          >
            <label className="sidebar-view-tab" id="tab-original-notes">
              <input
                checked={conceptsSidebarMode === "original-notes"}
                className="sidebar-view-tab-input"
                name="concepts-sidebar-mode"
                onChange={() => setConceptsSidebarMode("original-notes")}
                type="radio"
                value="original-notes"
              />
              <span className="sidebar-view-tab-label">
                <FileText aria-hidden="true" />
                Original notes
              </span>
            </label>
            <label className="sidebar-view-tab" id="tab-explore-concepts">
              <input
                checked={conceptsSidebarMode === "explore-concepts"}
                className="sidebar-view-tab-input"
                name="concepts-sidebar-mode"
                onChange={() => setConceptsSidebarMode("explore-concepts")}
                type="radio"
                value="explore-concepts"
              />
              <span className="sidebar-view-tab-label">
                <Compass aria-hidden="true" />
                Explore concepts
              </span>
            </label>
          </div>

          {conceptsSidebarMode === "explore-concepts" ? (
            <nav
              className="concept-list"
              aria-label="Choose concept artifact"
              id="panel-explore-concepts"
            >
              {learningPlan.storyboard.map((beat, index) => (
                <button
                  aria-current={
                    selectedArtifact ? beat.id === selectedArtifact.id : false
                  }
                  className="concept-artifact"
                  key={beat.id}
                  onClick={() => selectArtifact(beat.id)}
                  type="button"
                >
                  <span className="concept-pin" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="concept-artifact-copy">
                    <strong>{beat.topic}</strong>
                  </span>
                  {beat.origin === "generated" ? (
                    <Sparkles aria-label="Generated artifact" />
                  ) : (
                    <ChevronRight aria-hidden="true" />
                  )}
                </button>
              ))}
            </nav>
          ) : (
            <div
              aria-labelledby="tab-original-notes"
              className="original-notes-hint"
              id="panel-original-notes"
              role="tabpanel"
            >
              <strong>Reading the source PDF</strong>
              The chapter PDF opens in the center. Switch to Explore concepts
              to open interactive artifacts for each idea.
            </div>
          )}
        </aside>

        <section
          className="artifact-workbench"
          aria-label={
            conceptsSidebarMode === "original-notes"
              ? "Original notes PDF"
              : "Selected artifact"
          }
        >
          {conceptsSidebarMode === "original-notes" ? (
            <>
              <header className="artifact-header">
                <h2>{selectedNote.title}</h2>
                <p>Original notes · PDF</p>
              </header>
              <div className="artifact-canvas">
                <iframe
                  className="artifact-frame pdf-source-frame"
                  src={pdfSourceUrl}
                  title={`${selectedNote.title} original notes`}
                />
              </div>
            </>
          ) : selectedArtifact ? (
            <>
              <header className="artifact-header">
                <h2>{selectedArtifact.topic}</h2>
              </header>

              <div className="artifact-canvas">
                <iframe
                  key={selectedArtifact.id}
                  className="artifact-frame"
                  sandbox="allow-scripts"
                  srcDoc={selectedArtifact.html}
                  title={`${selectedArtifact.topic} artifact`}
                />
              </div>
            </>
          ) : (
            <>
              <header className="artifact-header">
                <h2>{selectedNote.title}</h2>
                <p>No artifacts yet</p>
              </header>
              <div className="artifact-canvas explore-empty">
                <p>
                  There are no interactive artifacts for this chapter yet. Use
                  the chat to generate one, or switch to Original notes to read
                  the PDF.
                </p>
              </div>
            </>
          )}
        </section>

        <aside className="tutor-rail" aria-label="Tutor chat">
          <div className="tutor-header">
            <div>
              <p className="panel-kicker">
                <Bot aria-hidden="true" />
                Tutor agent
              </p>
              <h2>Chat</h2>
            </div>
            {status === "streaming" || status === "submitted" ? (
              <button className="icon-text-button" onClick={stop} type="button">
                <RotateCcw aria-hidden="true" />
                Stop
              </button>
            ) : null}
          </div>

          <p className="tutor-context">
            {conceptsSidebarMode === "original-notes" ? (
              <>
                Viewing <strong>original notes</strong> for{" "}
                <strong>{selectedNote.title}</strong>
              </>
            ) : selectedArtifact ? (
              <>
                Focused on <strong>{selectedArtifact.topic}</strong>
              </>
            ) : (
              <>
                Chapter <strong>{selectedNote.title}</strong> · pick a concept
                when available
              </>
            )}
          </p>

          <div className="chat-scroll">
            {messages.length === 0 ? (
              <div className="prompt-slate">
                <div>
                  <Sparkles aria-hidden="true" />
                  <strong>Ask or generate from here</strong>
                </div>
                <div className="prompt-list">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={`sp-${index}`}
                      onClick={() => void submitMessage(prompt)}
                      title={prompt}
                      type="button"
                    >
                      <span>{truncateWords(prompt)}</span>
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
                  onRequestArtifact={requestArtifactForMessage}
                  canRequestArtifact={Boolean(selectedArtifact)}
                  isChatReady={status === "ready"}
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
              placeholder="Ask about this concept or request a new artifact..."
              value={input}
            />
            <button disabled={!canSend} title="Send" type="submit">
              <Send aria-hidden="true" />
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}

function ChatMessage({
  message,
  onOpenArtifact,
  onRequestArtifact,
  canRequestArtifact,
  isChatReady,
}: {
  message: UIMessage;
  onOpenArtifact: (artifact: BuiltArtifact) => void;
  onRequestArtifact: (message: UIMessage) => void;
  canRequestArtifact: boolean;
  isChatReady: boolean;
}) {
  const isUser = message.role === "user";
  const canShowRequest =
    !isUser &&
    canRequestArtifact &&
    hasTextPart(message) &&
    !hasGeneratedArtifact(message);

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
        {canShowRequest ? (
          <div className="message-actions">
            <button
              className="show-me-button"
              disabled={!isChatReady}
              onClick={() => onRequestArtifact(message)}
              type="button"
            >
              <Sparkles aria-hidden="true" />
              Show me
            </button>
          </div>
        ) : null}
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
    return (
      <div className="message-copy markdown-output">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
      </div>
    );
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
              {part.output.learning_design?.core_aha ? (
                <p>{compactText(part.output.learning_design.core_aha, 132)}</p>
              ) : null}
            </div>
            <button
              onClick={() => onOpenArtifact(part.output as BuiltArtifact)}
              type="button"
            >
              Open
            </button>
          </div>
          <iframe
            key={part.output.id}
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

function hasTextPart(message: UIMessage) {
  return getMessageText(message).length > 0;
}

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function hasGeneratedArtifact(message: UIMessage) {
  return message.parts.some(
    (part) =>
      isBuildArtifactPart(part) &&
      part.state === "output-available" &&
      isBuiltArtifact(part.output),
  );
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
  const storyboard = artifacts.map((artifact) => ({
    id: artifact.id,
    topic: artifact.topic,
    origin: artifact.origin,
  }));

  return { storyboard };
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
    artifact_metadata: artifact.artifact_metadata,
    learning_design: artifact.learning_design,
    representations: artifact.representations,
    controls: artifact.controls,
    scenarios: artifact.scenarios,
    checkpoints: artifact.checkpoints,
    ui_requirements: artifact.ui_requirements,
  };
}
