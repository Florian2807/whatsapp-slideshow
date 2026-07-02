import path from "node:path";

export const appConfig = {
  appName: "WhatsApp Slideshow",
  loginCookieName: "slideshow_session",
  dashboardRefreshMs: 10_000,
  playerRefreshMs: 15_000,
  sessionMaxAgeSeconds: 60 * 60 * 24 * 30,
  dataDir: path.join(process.cwd(), "data"),
  libraryDir: path.join(process.cwd(), "data", "library"),
  databasePath: path.join(process.cwd(), "data", "media.db"),
  allowedMimeTypes: {
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  } as const,
};

export type AllowedMimeType = keyof typeof appConfig.allowedMimeTypes;

export const allowedExtensions = new Set<string>(
  Object.values(appConfig.allowedMimeTypes),
);

// Standardwerte für Settings (können vom User angepasst werden)
export const defaultSettings = {
  // Player
  playerSlideDurationMs: 8_000,
  playerRandomOrder: false,

  // Speicherverwaltung
  storageCleanupEnabled: true,
  storageMaxBytes: 1_000_000_000, // 1GB default
  storageMaxDays: 365, // 1 Jahr
  storageMaxFiles: 0, // 0 = unbegrenzt
};

export type Settings = typeof defaultSettings;
