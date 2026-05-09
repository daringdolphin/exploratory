import {
  createAgentUIStreamResponse,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import {
  getGatewaySetupMessage,
  getTutorStreamErrorMessage,
} from "@/lib/ai/gateway-config";
import {
  buildTutorContext,
  createTutorAgent,
  parseTutorRequest,
} from "@/lib/ai/tutor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid chat request." }, { status: 400 });
  }

  const { messages, ...rawContext } = body as {
    messages?: unknown[];
    [key: string]: unknown;
  };

  if (!Array.isArray(messages)) {
    return Response.json({ error: "Missing messages array." }, { status: 400 });
  }

  if (!hasGatewayAuthHint(request)) {
    return createSetupMessageResponse();
  }

  const context = buildTutorContext(parseTutorRequest(rawContext));
  const agent = createTutorAgent(context);

  try {
    return await createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
      timeout: { totalMs: 60_000 },
      onError: getTutorStreamErrorMessage,
    });
  } catch (error) {
    return createSetupMessageResponse(getTutorStreamErrorMessage(error));
  }
}

function createSetupMessageResponse(message = getGatewaySetupMessage()) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id: "gateway-setup" });
      writer.write({
        type: "text-delta",
        id: "gateway-setup",
        delta: message,
      });
      writer.write({ type: "text-end", id: "gateway-setup" });
      writer.write({ type: "finish", finishReason: "error" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function hasGatewayAuthHint(request: Request) {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      request.headers.has("x-vercel-oidc-token") ||
      process.env.VERCEL === "1",
  );
}
