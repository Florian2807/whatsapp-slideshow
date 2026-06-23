import { isAuthenticated } from "@/lib/auth";
import { getHealth } from "@/lib/settings";
import { getSettings } from "@/lib/settings";
import { getDashboardSummary } from "@/lib/media-store";

export async function GET() {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const health = await getHealth();
    const summary = await getDashboardSummary();
    const settings = await getSettings();

    return Response.json({
      health,
      storage: {
        usedBytes: summary.totalBytes,
        maxBytes: settings.storageMaxBytes,
        usedPercent: settings.storageMaxBytes > 0
          ? Math.round((summary.totalBytes / settings.storageMaxBytes) * 100)
          : 0,
        imageCount: summary.visible,
        maxImageCount: settings.storageMaxFiles || null,
      },
      policies: {
        cleanupEnabled: settings.storageCleanupEnabled,
        maxBytes: settings.storageMaxBytes,
        maxDays: settings.storageMaxDays,
        maxFiles: settings.storageMaxFiles,
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
