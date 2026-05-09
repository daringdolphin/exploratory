"use client";

import { useChat } from "@ai-sdk/react";
import {
  Bot,
  BookOpen,
  FileText,
  Loader2,
  MessageSquareText,
  PanelLeft,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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

const suggestedPrompts = [
  "Explain this in simpler particle terms.",
  "Show me why the rate changes.",
  "Make a follow-up artifact comparing the two cases.",
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

  function openGeneratedArtifact(artifact: BuiltArtifact) {
    setSelectedArtifactId(artifact.id);
  }

  if (!selectedNote || !selectedArtifact) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p>No seeded notes found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-[1800px] grid-cols-1 gap-3 p-3 lg:grid-cols-[280px_minmax(0,1fr)_420px]">
        <aside className="flex min-h-[280px] flex-col rounded-lg border border-rule bg-paper">
          <div className="border-b border-rule p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted">
              <BookOpen className="h-4 w-4" />
              Seeded notes
            </div>
            <h1 className="mt-2 font-display text-3xl leading-none">
              Chemistry Tutor
            </h1>
          </div>

          <div className="grid gap-2 p-3">
            {noteSets.map((noteSet) => (
              <button
                className={`rounded-lg border p-3 text-left transition hover:border-ink ${
                  noteSet.id === selectedNote.id
                    ? "border-agent bg-agent/10"
                    : "border-rule bg-white/40"
                }`}
                key={noteSet.id}
                onClick={() => {
                  setSelectedNoteId(noteSet.id);
                  setSelectedArtifactId(noteSet.artifacts[0]?.id ?? "");
                }}
                type="button"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4" />
                  {noteSet.title}
                </span>
                <span className="mt-2 block text-sm leading-5 text-muted">
                  {noteSet.summary}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-auto border-t border-rule p-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted">
              <PanelLeft className="h-4 w-4" />
              Source pages
            </div>
            <div className="mt-2 grid gap-1">
              {selectedNote.pages.map((page) => (
                <div
                  className="grid grid-cols-[34px_1fr] gap-2 rounded-md px-2 py-1.5 text-sm"
                  key={page.page_number}
                >
                  <span className="font-mono text-xs text-muted">
                    {String(page.page_number).padStart(2, "0")}
                  </span>
                  <span className="truncate">{page.title}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="grid min-h-[760px] grid-rows-[minmax(260px,0.45fr)_minmax(420px,0.55fr)] gap-3">
          <div className="overflow-hidden rounded-lg border border-rule bg-paper">
            <div className="flex items-center justify-between border-b border-rule px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-muted">
                  Original document
                </p>
                <h2 className="font-display text-2xl leading-tight">
                  {selectedNote.sourceFile}
                </h2>
              </div>
              <a
                className="inline-flex items-center gap-2 rounded-lg border border-rule bg-resolution/20 px-3 py-2 text-sm font-semibold text-ink transition hover:border-ink"
                href={`/api/source/${selectedNote.id}`}
                rel="noreferrer"
                target="_blank"
              >
                <FileText className="h-4 w-4" />
                Open
              </a>
            </div>
            <iframe
              className="h-[calc(100%-73px)] min-h-[240px] w-full bg-white"
              src={`/api/source/${selectedNote.id}`}
              title={`${selectedNote.title} source PDF`}
            />
          </div>

          <div className="grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-[260px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-lg border border-rule bg-paper">
              <div className="border-b border-rule px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-normal text-muted">
                  Explainer artifacts
                </p>
              </div>
              <div className="max-h-[620px] overflow-auto p-3">
                {artifacts.map((artifact) => (
                  <ArtifactButton
                    artifact={artifact}
                    isSelected={artifact.id === selectedArtifact.id}
                    key={artifact.id}
                    onSelect={() => setSelectedArtifactId(artifact.id)}
                  />
                ))}
              </div>
            </div>

            <article className="overflow-hidden rounded-lg border border-rule bg-paper">
              <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-normal text-muted">
                    {selectedArtifact.origin === "seed"
                      ? "Seeded artifact"
                      : "Generated follow-up"}
                  </p>
                  <h2 className="truncate font-display text-2xl leading-tight">
                    {selectedArtifact.topic}
                  </h2>
                </div>
                <span className="rounded-md bg-highlight/25 px-2 py-1 font-mono text-xs">
                  {selectedArtifact.source_ref}
                </span>
              </div>
              <iframe
                className="h-[calc(100%-73px)] min-h-[520px] w-full bg-white"
                sandbox="allow-scripts"
                srcDoc={selectedArtifact.html}
                title={`${selectedArtifact.topic} artifact`}
              />
            </article>
          </div>
        </section>

        <aside className="flex min-h-[760px] flex-col rounded-lg border border-rule bg-paper">
          <div className="border-b border-rule p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-muted">
                  Agent thread
                </p>
                <h2 className="font-display text-2xl leading-tight">
                  Chat Tutor
                </h2>
              </div>
              {status === "streaming" || status === "submitted" ? (
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-rule bg-white/50 px-3 py-2 text-sm font-semibold"
                  onClick={stop}
                  type="button"
                >
                  <RotateCcw className="h-4 w-4" />
                  Stop
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-5 text-muted">
              Current context: {selectedArtifact.topic}
            </p>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {messages.length === 0 ? (
              <div className="rounded-lg border border-rule bg-white/45 p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-agent" />
                  Start with the artifact on screen
                </div>
                <div className="mt-3 grid gap-2">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      className="rounded-lg border border-rule bg-paper px-3 py-2 text-left text-sm transition hover:border-ink"
                      key={prompt}
                      onClick={() => void submitMessage(prompt)}
                      type="button"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onOpenArtifact={openGeneratedArtifact}
                />
              ))}
              {status === "submitted" ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking through the mechanism...
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>
          </div>

          {error ? (
            <div className="border-t border-problem/20 bg-problem/10 px-4 py-3 text-sm text-problem">
              {error.message}
            </div>
          ) : null}

          <form className="border-t border-rule p-3" onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <textarea
                className="min-h-12 flex-1 resize-none rounded-lg border border-rule bg-white/60 px-3 py-2 text-sm outline-none transition focus:border-agent"
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitMessage(input);
                  }
                }}
                placeholder="Ask a follow-up..."
                value={input}
              />
              <button
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-agent text-white transition hover:bg-agent/90 disabled:cursor-not-allowed disabled:bg-muted"
                disabled={!input.trim() || status !== "ready"}
                title="Send"
                type="submit"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </form>
        </aside>
      </div>
    </main>
  );
}

function ArtifactButton({
  artifact,
  isSelected,
  onSelect,
}: {
  artifact: ArtifactRecord | GeneratedArtifact;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`mb-2 w-full rounded-lg border p-3 text-left transition hover:border-ink ${
        isSelected ? "border-highlight bg-highlight/15" : "border-rule bg-white/40"
      }`}
      onClick={onSelect}
      type="button"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-semibold">{artifact.topic}</span>
        {artifact.origin === "generated" ? (
          <Sparkles className="h-4 w-4 shrink-0 text-agent" />
        ) : (
          <Play className="h-4 w-4 shrink-0 text-muted" />
        )}
      </span>
      <span className="mt-2 line-clamp-3 block text-sm leading-5 text-muted">
        {artifact.mechanism}
      </span>
    </button>
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
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-agent text-white">
          <Bot className="h-4 w-4" />
        </div>
      ) : null}

      <div
        className={`max-w-[88%] rounded-lg border px-3 py-2 text-sm leading-6 ${
          isUser
            ? "border-agent/20 bg-agent text-white"
            : "border-rule bg-white/55"
        }`}
      >
        {message.parts.map((part, index) => (
          <MessagePart
            key={`${message.id}-${index}`}
            onOpenArtifact={onOpenArtifact}
            part={part}
          />
        ))}
      </div>

      {isUser ? (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-neutral text-white">
          <User className="h-4 w-4" />
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
    return <p className="whitespace-pre-wrap">{part.text}</p>;
  }

  if (isBuildArtifactPart(part)) {
    if (part.state === "input-streaming" || part.state === "input-available") {
      return (
        <div className="my-2 rounded-lg border border-rule bg-paper p-3">
          <div className="flex items-center gap-2 font-semibold">
            <Loader2 className="h-4 w-4 animate-spin text-agent" />
            Building artifact
          </div>
          {part.input?.topic ? (
            <p className="mt-1 text-muted">{part.input.topic}</p>
          ) : null}
        </div>
      );
    }

    if (part.state === "output-error") {
      return (
        <div className="my-2 rounded-lg border border-problem/30 bg-problem/10 p-3 text-problem">
          {part.errorText ?? "The artifact tool failed."}
        </div>
      );
    }

    if (part.state === "output-available" && part.output) {
      return (
        <div className="my-2 overflow-hidden rounded-lg border border-agent/30 bg-agent/10">
          <div className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-semibold">
                <MessageSquareText className="h-4 w-4 shrink-0 text-agent" />
                <span className="truncate">{part.output.topic}</span>
              </div>
              <p className="mt-1 line-clamp-3 text-muted">
                {part.output.mechanism}
              </p>
            </div>
            <button
              className="shrink-0 rounded-md border border-agent/30 bg-white/70 px-2 py-1 text-xs font-semibold text-ink transition hover:border-agent"
              onClick={() => onOpenArtifact(part.output as BuiltArtifact)}
              type="button"
            >
              Open
            </button>
          </div>
          <iframe
            className="h-80 w-full border-t border-agent/20 bg-white"
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
