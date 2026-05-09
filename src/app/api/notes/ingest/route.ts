import type { ZodIssue } from "zod";
import { getGatewaySetupMessage } from "@/lib/ai/gateway-config";
import {
  ingestNotesToArtifactSpecs,
  notesIngestionRequestSchema,
  type NotesIngestionRequest,
  type UploadedNotesFile,
} from "@/lib/ai/notes-ingestion";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  if (!hasGatewayAuthHint(request)) {
    return Response.json({ error: getGatewaySetupMessage() }, { status: 503 });
  }

  const parsed = await parseNotesIngestionRequest(request);

  if (!parsed.success) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await ingestNotesToArtifactSpecs(parsed.data);

    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: getNotesIngestionErrorMessage(error) },
      { status: 500 },
    );
  }
}

async function parseNotesIngestionRequest(request: Request): Promise<
  | { success: true; data: NotesIngestionRequest }
  | { success: false; error: string }
> {
  const contentType = request.headers.get("content-type") ?? "";
  let rawInput: unknown;

  try {
    rawInput = contentType.includes("multipart/form-data")
      ? await parseMultipartRequest(request)
      : contentType.includes("text/plain")
        ? { notes: await request.text() }
        : await request.json().catch(() => null);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid upload.",
    };
  }

  const parsed = notesIngestionRequestSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map(
          (issue: ZodIssue) =>
            `${issue.path.join(".") || "request"}: ${issue.message}`,
        )
        .join("\n"),
    };
  }

  return { success: true, data: parsed.data };
}

async function parseMultipartRequest(request: Request) {
  const formData = await request.formData();
  const fileValue = formData.get("file") ?? formData.get("notesFile");
  const notesValue = formData.get("notes") ?? formData.get("text");
  const uploaded: { notes?: string; file?: UploadedNotesFile; filename?: string } =
    fileValue instanceof File ? await parseUploadedNotesFile(fileValue) : {};
  const notesFromField =
    typeof notesValue === "string" && notesValue.trim()
      ? notesValue
      : undefined;

  return {
    title: getStringFormValue(formData, "title"),
    subject: getStringFormValue(formData, "subject"),
    level: getStringFormValue(formData, "level"),
    syllabusReference: getStringFormValue(formData, "syllabusReference"),
    sourceName:
      getStringFormValue(formData, "sourceName") ??
      uploaded.file?.filename ??
      uploaded.filename,
    notes: notesFromField ?? uploaded.notes,
    focus: getStringFormValue(formData, "focus"),
    maxArtifacts: getNumberFormValue(formData, "maxArtifacts"),
    file: uploaded.file,
  };
}

async function parseUploadedNotesFile(file: File): Promise<{
  notes?: string;
  file?: UploadedNotesFile;
  filename?: string;
}> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Uploaded notes file is too large. Max size is ${MAX_UPLOAD_BYTES} bytes.`,
    );
  }

  const mediaType = file.type || inferMediaType(file.name);

  if (mediaType.startsWith("text/") || mediaType === "application/json") {
    return {
      filename: file.name,
      notes: await file.text(),
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    file: {
      filename: file.name,
      mediaType,
      dataUrl: `data:${mediaType};base64,${buffer.toString("base64")}`,
      size: file.size,
    },
  };
}

function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumberFormValue(formData: FormData, key: string) {
  const value = getStringFormValue(formData, key);
  return value ? Number(value) : undefined;
}

function inferMediaType(filename: string) {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (lower.endsWith(".md")) {
    return "text/markdown";
  }

  if (lower.endsWith(".json")) {
    return "application/json";
  }

  return "text/plain";
}

function hasGatewayAuthHint(request: Request) {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      request.headers.has("x-vercel-oidc-token") ||
      process.env.VERCEL === "1",
  );
}

function getNotesIngestionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("AI Gateway authentication failed") ||
    message.includes("AI_GATEWAY_API_KEY") ||
    message.includes("VERCEL_OIDC_TOKEN") ||
    message.includes("x-vercel-oidc-token")
  ) {
    return getGatewaySetupMessage();
  }

  return "The notes ingestion agent hit an AI Gateway error while building artifact specs. Please try again in a moment.";
}
