import fs from "node:fs/promises";

import JSZip from "jszip";

import { isAuthenticated } from "@/lib/auth";
import { getMediaFile, listMedia } from "@/lib/media-store";

export const dynamic = "force-dynamic";

function unauthorizedResponse() {
  return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
}

function createTimestamp() {
  const date = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim() || "bild";
}

function buildDownloadHeaders(fileName: string, contentType: string) {
  const safeName = sanitizeFileName(fileName);

  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    "Cache-Control": "private, no-store",
  };
}

function buildArchiveEntryName(
  fileName: string,
  usedNames: Map<string, number>,
) {
  const normalized = sanitizeFileName(fileName);
  const lastDotIndex = normalized.lastIndexOf(".");
  const baseName = lastDotIndex > 0 ? normalized.slice(0, lastDotIndex) : normalized;
  const extension = lastDotIndex > 0 ? normalized.slice(lastDotIndex) : "";
  const currentCount = usedNames.get(normalized) ?? 0;

  if (currentCount === 0) {
    usedNames.set(normalized, 1);
    return normalized;
  }

  usedNames.set(normalized, currentCount + 1);
  return `${baseName}-${currentCount + 1}${extension}`;
}

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  const selectedIds = Array.from(
    new Set(
      url.searchParams
        .getAll("id")
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );

  if (scope !== "all" && selectedIds.length === 0) {
    return Response.json(
      { error: "Keine Bilder zum Herunterladen ausgewaehlt." },
      { status: 400 },
    );
  }

  if (scope !== "all" && selectedIds.length === 1) {
    const media = await getMediaFile(selectedIds[0]);

    if (!media) {
      return new Response("Nicht gefunden.", { status: 404 });
    }

    const buffer = await fs.readFile(media.filePath);

    return new Response(buffer, {
      headers: {
        ...buildDownloadHeaders(
          media.originalName ?? media.fileName,
          media.mimeType,
        ),
        "Content-Length": buffer.byteLength.toString(),
      },
    });
  }

  const mediaItems = await listMedia({ includeHidden: true });
  const selectedItems =
    scope === "all"
      ? mediaItems
      : mediaItems.filter((item) => selectedIds.includes(item.id));

  if (selectedItems.length === 0) {
    return Response.json(
      { error: "Keine passenden Bilder gefunden." },
      { status: 404 },
    );
  }

  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  for (const item of selectedItems) {
    const media = await getMediaFile(item.id);

    if (!media) {
      continue;
    }

    const buffer = await fs.readFile(media.filePath);
    const archiveEntryName = buildArchiveEntryName(
      media.originalName ?? media.fileName,
      usedNames,
    );

    zip.file(archiveEntryName, buffer);
  }

  const archiveData = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  const archiveBuffer = Buffer.from(archiveData);
  const archiveName =
    scope === "all"
      ? `whatsapp-slideshow-alle-bilder-${createTimestamp()}.zip`
      : `whatsapp-slideshow-auswahl-${createTimestamp()}.zip`;

  return new Response(archiveBuffer, {
    headers: {
      ...buildDownloadHeaders(archiveName, "application/zip"),
      "Content-Length": archiveBuffer.byteLength.toString(),
    },
  });
}
