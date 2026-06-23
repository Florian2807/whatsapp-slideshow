import fs from "node:fs/promises";

import { getMediaFile } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/media/[id]">,
) {
  const { id } = await context.params;
  const media = await getMediaFile(Number(id));

  if (!media) {
    return new Response("Nicht gefunden.", { status: 404 });
  }

  const buffer = await fs.readFile(media.filePath);

  return new Response(buffer, {
    headers: {
      "Content-Type": media.mimeType,
      "Cache-Control": "private, max-age=60",
      "Content-Length": buffer.byteLength.toString(),
    },
  });
}
