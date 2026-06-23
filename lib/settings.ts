import { defaultSettings, type Settings } from "@/lib/config";
import { getDb } from "@/lib/media-store";

type SettingsKey = keyof Settings;
type SettingsValue = Settings[SettingsKey];

let settingsInitialization: Promise<void> | null = null;

export function isSettingsKey(value: string): value is SettingsKey {
  return value in defaultSettings;
}

export function coerceSettingValue(
  key: SettingsKey,
  value: unknown,
): SettingsValue | null {
  const template = defaultSettings[key];

  if (typeof template === "boolean") {
    return typeof value === "boolean" ? value : null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }

  return value;
}

function parseStoredSetting(key: SettingsKey, value: string): SettingsValue | null {
  try {
    return coerceSettingValue(key, JSON.parse(value));
  } catch {
    return null;
  }
}

async function ensureSettingsTable() {
  if (!settingsInitialization) {
    settingsInitialization = (async () => {
      const db = getDb();
      db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      const existing = db
        .prepare("SELECT COUNT(*) as count FROM settings")
        .get() as { count: number };

      if (existing.count === 0) {
        const timestamp = new Date().toISOString();
        const stmt = db.prepare(
          "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
        );

        for (const [key, value] of Object.entries(defaultSettings)) {
          stmt.run(key, JSON.stringify(value), timestamp);
        }
      }
    })().catch((error) => {
      settingsInitialization = null;
      throw error;
    });
  }

  await settingsInitialization;
}

export async function initSettingsTable() {
  await ensureSettingsTable();
}

export async function getSettings(): Promise<Settings> {
  await ensureSettingsTable();
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as Array<{
    key: string;
    value: string;
  }>;

  const result: Settings = { ...defaultSettings };
  const mutableResult = result as Record<string, SettingsValue>;

  for (const row of rows) {
    if (!isSettingsKey(row.key)) {
      continue;
    }

    const parsed = parseStoredSetting(row.key, row.value);

    if (parsed !== null) {
      mutableResult[row.key] = parsed;
    }
  }

  return result;
}

export async function updateSetting<K extends SettingsKey>(
  key: K,
  value: Settings[K],
) {
  await ensureSettingsTable();
  const db = getDb();
  db.prepare(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
  ).run(key, JSON.stringify(value), new Date().toISOString());
}

export async function updateSettings(values: Partial<Settings>) {
  await ensureSettingsTable();
  const db = getDb();
  const timestamp = new Date().toISOString();
  const stmt = db.prepare(
    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
  );
  const transaction = db.transaction((entries: Array<[SettingsKey, SettingsValue]>) => {
    for (const [key, value] of entries) {
      stmt.run(key, JSON.stringify(value), timestamp);
    }
  });

  transaction(Object.entries(values) as Array<[SettingsKey, SettingsValue]>);
}

export async function getHealth() {
  const db = getDb();

  try {
    db.prepare("SELECT 1").get();

    const stats = db
      .prepare(
        `
        SELECT
          COUNT(*) as total_images,
          SUM(size_bytes) as total_bytes,
          MAX(created_at) as last_image
        FROM media
        WHERE hidden = 0
      `,
      )
      .get() as {
      total_images: number;
      total_bytes: number | null;
      last_image: string | null;
    };

    return {
      status: "ok" as const,
      database: "connected" as const,
      timestamp: new Date().toISOString(),
      stats: {
        totalImages: stats.total_images || 0,
        totalBytes: stats.total_bytes || 0,
        lastImageAt: stats.last_image || null,
      },
    };
  } catch (error) {
    return {
      status: "error" as const,
      database: "disconnected" as const,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
