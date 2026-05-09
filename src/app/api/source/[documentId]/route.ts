import { promises as fs } from "fs";
import path from "path";
import { getNoteSetById } from "@/lib/seed-data";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await context.params;
  const noteSet = getNoteSetById(documentId);

  if (!noteSet) {
    return Response.json({ error: "Unknown source document." }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "seed", noteSet.sourceFile);
  const file = await fs.readFile(filePath);

  return new Response(new Uint8Array(file), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="${noteSet.sourceFile}"`,
      "Content-Type": "application/pdf",
    },
  });
}
