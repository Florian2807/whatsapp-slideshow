import crypto from "node:crypto";
import fs from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import {
  allowedExtensions,
  appConfig,
  type AllowedMimeType,
} from "@/lib/config";

type MediaRow = {
  id: number;
  file_name: string;
  original_name: string | null;
  mime_type: string;
  created_at: string;
  hidden: number;
  size_bytes: number;
  sender: string | null;
};

export type MediaItem = {
  id: number;
  fileName: string;
  originalName: string | null;
  mimeType: string;
  createdAt: string;
  hidden: boolean;
  sizeBytes: number;
  sender: string | null;
  url: string;
};

export type DashboardSummary = {
  total: number;
  visible: number;
  hidden: number;
  totalBytes: number;
  latestImageAt: string | null;
};

type ImportMediaBufferOptions = {
  buffer: Buffer;
  mimeType: AllowedMimeType;
  originalName?: string | null;
  sender?: string | null;
  createdAt?: Date;
};

let database: Database.Database | null = null;

function ensureStorage() {
  if (!existsSync(appConfig.dataDir)) {
    mkdirSync(appConfig.dataDir, { recursive: true });
  }

  if (!existsSync(appConfig.libraryDir)) {
    mkdirSync(appConfig.libraryDir, { recursive: true });
  }
}

function getMimeTypeForExtension(extension: string) {
  const normalized = extension.replace(".", "").toLowerCase();

  return (
    Object.entries(appConfig.allowedMimeTypes).find(
      ([, value]) => value === normalized,
    )?.[0] ?? null
  );
}

export function getDb() {
  ensureStorage();

  if (!database) {
    database = new Database(appConfig.databasePath);
    database.pragma("journal_mode = WAL");
    database.exec(`
      CREATE TABLE IF NOT EXISTS media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL UNIQUE,
        original_name TEXT,
        mime_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        hidden INTEGER NOT NULL DEFAULT 0,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        sender TEXT
      )
    `);
  }

  return database;
}

function formatTimestamp(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("") +
    "_" +
    [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join("");
}

function mapRow(row: MediaRow): MediaItem {
  return {
    id: row.id,
    fileName: row.file_name,
    originalName: row.original_name,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    hidden: row.hidden === 1,
    sizeBytes: row.size_bytes,
    sender: row.sender,
    url: `/api/media/${row.id}`,
  };
}

async function syncMediaLibrary() {
  ensureStorage();
  const db = getDb();
  const diskEntries = await fs.readdir(appConfig.libraryDir, { withFileTypes: true });
  const fileNames = diskEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => {
      const extension = path.extname(fileName).slice(1).toLowerCase();
      return allowedExtensions.has(extension);
    })
    .sort();

  const rows = db
    .prepare("SELECT id, file_name FROM media ORDER BY created_at ASC")
    .all() as Array<{ id: number; file_name: string }>;
  const dbByFileName = new Map(rows.map((row) => [row.file_name, row.id]));
  const diskSet = new Set(fileNames);

  for (const row of rows) {
    if (!diskSet.has(row.file_name)) {
      db.prepare("DELETE FROM media WHERE id = ?").run(row.id);
    }
  }

  for (const fileName of fileNames) {
    if (dbByFileName.has(fileName)) {
      continue;
    }

    const filePath = path.join(appConfig.libraryDir, fileName);
    const stats = await fs.stat(filePath);
    const mimeType = getMimeTypeForExtension(path.extname(fileName));

    if (!mimeType) {
      continue;
    }

    db.prepare(
      `
        INSERT OR IGNORE INTO media (file_name, original_name, mime_type, created_at, hidden, size_bytes)
        VALUES (?, ?, ?, ?, 0, ?)
      `,
    ).run(
      fileName,
      fileName,
      mimeType,
      (stats.birthtime ?? stats.mtime).toISOString(),
      stats.size,
    );
  }
}

export async function listMedia(options?: { includeHidden?: boolean }) {
  await syncMediaLibrary();
  const db = getDb();
  const includeHidden = options?.includeHidden ?? false;
  const query = includeHidden
    ? "SELECT * FROM media ORDER BY created_at ASC, id ASC"
    : "SELECT * FROM media WHERE hidden = 0 ORDER BY created_at ASC, id ASC";

  return (db.prepare(query).all() as MediaRow[]).map(mapRow);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  await syncMediaLibrary();
  const db = getDb();
  const counts = db
    .prepare(
      `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN hidden = 0 THEN 1 ELSE 0 END) as visible,
          SUM(CASE WHEN hidden = 1 THEN 1 ELSE 0 END) as hidden,
          SUM(size_bytes) as total_bytes,
          MAX(created_at) as latest_image_at
        FROM media
      `,
    )
    .get() as {
    total: number;
    visible: number | null;
    hidden: number | null;
    total_bytes: number | null;
    latest_image_at: string | null;
  };

  return {
    total: counts.total,
    visible: counts.visible ?? 0,
    hidden: counts.hidden ?? 0,
    totalBytes: counts.total_bytes ?? 0,
    latestImageAt: counts.latest_image_at,
  };
}

export async function setMediaHidden(id: number, hidden: boolean) {
  const db = getDb();
  db.prepare("UPDATE media SET hidden = ? WHERE id = ?").run(hidden ? 1 : 0, id);
}

export async function deleteMedia(id: number) {
  const db = getDb();
  const row = db.prepare("SELECT file_name FROM media WHERE id = ?").get(id) as
    | { file_name: string }
    | undefined;

  if (!row) {
    return;
  }

  db.prepare("DELETE FROM media WHERE id = ?").run(id);
  await fs.rm(path.join(appConfig.libraryDir, row.file_name), { force: true });
}

export async function importUploadedFile(file: File) {
  return importMediaBuffer({
    buffer: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type as AllowedMimeType,
    originalName: file.name || null,
  });
}

export async function importMediaBuffer({
  buffer,
  mimeType,
  originalName,
  sender,
  createdAt,
}: ImportMediaBufferOptions) {
  const extension = appConfig.allowedMimeTypes[mimeType];

  if (!extension) {
    throw new Error("Dieser Dateityp wird nicht unterstuetzt.");
  }

  ensureStorage();

  const timestamp = createdAt ?? new Date();
  const randomSuffix = crypto.randomBytes(3).toString("hex");
  const fileName = `${formatTimestamp(timestamp)}_${randomSuffix}.${extension}`;
  const filePath = path.join(appConfig.libraryDir, fileName);
  const tempPath = `${filePath}.tmp`;
  const db = getDb();

  await fs.writeFile(tempPath, buffer);
  await fs.rename(tempPath, filePath);

  db.prepare(
    `
      INSERT OR IGNORE INTO media (file_name, original_name, mime_type, created_at, hidden, size_bytes, sender)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `,
  ).run(
    fileName,
    originalName ?? fileName,
    mimeType,
    timestamp.toISOString(),
    buffer.byteLength,
    sender ?? null,
  );
}

export async function getMediaFile(id: number) {
  await syncMediaLibrary();
  const db = getDb();
  const row = db.prepare("SELECT * FROM media WHERE id = ?").get(id) as
    | MediaRow
    | undefined;

  if (!row) {
    return null;
  }

  const filePath = path.join(appConfig.libraryDir, row.file_name);

  try {
    await fs.access(filePath);
  } catch {
    db.prepare("DELETE FROM media WHERE id = ?").run(id);
    return null;
  }

  return {
    ...mapRow(row),
    filePath,
  };
}
