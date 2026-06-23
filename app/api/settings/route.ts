import { isAuthenticated } from "@/lib/auth";
import { enforceStoragePolicies } from "@/lib/cleanup";
import type { Settings } from "@/lib/config";
import {
  coerceSettingValue,
  getSettings,
  isSettingsKey,
  updateSettings,
} from "@/lib/settings";

function unauthorizedResponse() {
  return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const settings = await getSettings();
    return Response.json(settings);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  if (!(await isAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json()) as unknown;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "Ungueltige Einstellungsdaten." }, { status: 400 });
    }

    const changes: Partial<Settings> = {};
    const mutableChanges = changes as Record<string, Settings[keyof Settings]>;

    for (const [key, value] of Object.entries(body)) {
      if (!isSettingsKey(key)) {
        continue;
      }

      const coerced = coerceSettingValue(key, value);

      if (coerced === null) {
        return Response.json(
          { error: `Ungueltiger Wert fuer ${key}.` },
          { status: 400 },
        );
      }

      mutableChanges[key] = coerced;
    }

    if (Object.keys(changes).length > 0) {
      await updateSettings(changes);
    }

    const result = await enforceStoragePolicies();
    const updated = await getSettings();

    return Response.json({
      settings: updated,
      cleanup: result,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
