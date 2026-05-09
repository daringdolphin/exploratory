export const DEFAULT_TUTOR_MODEL = "openai/gpt-5.4";

export function getTutorModelId() {
  return process.env.AI_MODEL?.trim() || DEFAULT_TUTOR_MODEL;
}

export function getGatewaySetupMessage() {
  return [
    "AI Gateway is not configured yet, so I cannot run the chat tutor model.",
    "For shipping, set AI_GATEWAY_API_KEY in your Vercel project environment variables for Production, Preview, and Development. For local development, add the same key to .env.local.",
    "You can also use Vercel OIDC instead of a static key: run `vercel link` once, then `vercel env pull .env.local`. Local OIDC tokens expire, so re-run the pull when auth starts failing.",
    `Current tutor model: ${getTutorModelId()}`,
  ].join("\n\n");
}

export function getTutorStreamErrorMessage(error: unknown) {
  const message = getErrorMessage(error);

  if (
    message.includes("AI Gateway authentication failed") ||
    message.includes("AI_GATEWAY_API_KEY") ||
    message.includes("VERCEL_OIDC_TOKEN") ||
    message.includes("x-vercel-oidc-token")
  ) {
    return getGatewaySetupMessage();
  }

  return "The chat tutor hit an AI Gateway error while answering. Please try again in a moment.";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
