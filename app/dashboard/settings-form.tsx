"use client";

import { useEffect, useRef, useState } from "react";
import type { Settings } from "@/lib/config";

type SettingsFormState = "idle" | "loading" | "success" | "error";
type NumericSettingsKey =
  | "playerSlideDurationMs"
  | "storageMaxBytes"
  | "storageMaxDays"
  | "storageMaxFiles";

const numericSettingsKeys: NumericSettingsKey[] = [
  "playerSlideDurationMs",
  "storageMaxBytes",
  "storageMaxDays",
  "storageMaxFiles",
];

function getNumericDrafts(settings: Settings): Record<NumericSettingsKey, string> {
  return {
    playerSlideDurationMs: String(settings.playerSlideDurationMs),
    storageMaxBytes: String(settings.storageMaxBytes),
    storageMaxDays: String(settings.storageMaxDays),
    storageMaxFiles: String(settings.storageMaxFiles),
  };
}

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [numericDrafts, setNumericDrafts] = useState<Record<NumericSettingsKey, string> | null>(null);
  const [state, setState] = useState<SettingsFormState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const resetStateTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings");

        if (!res.ok) {
          throw new Error("Failed to load settings");
        }

        const data = await res.json();

        if (isMounted) {
          setSettings(data);
          setNumericDrafts(getNumericDrafts(data));
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;

      if (resetStateTimeoutRef.current !== null) {
        window.clearTimeout(resetStateTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!settings || !numericDrafts) return;

    const parsedNumericSettings = {} as Record<NumericSettingsKey, number>;

    for (const key of numericSettingsKeys) {
      const value = numericDrafts[key].trim();

      if (value === "") {
        setError("Bitte alle Zahlenfelder ausfuellen.");
        setState("error");
        return;
      }

      const parsed = Number.parseInt(value, 10);

      if (!Number.isInteger(parsed) || parsed < 0) {
        setError("Bitte nur ganze Zahlen ab 0 eingeben.");
        setState("error");
        return;
      }

      parsedNumericSettings[key] = parsed;
    }

    const nextSettings: Settings = {
      ...settings,
      ...parsedNumericSettings,
    };

    setState("loading");
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      });

      if (!res.ok) {
        throw new Error("Failed to update settings");
      }

      const data = await res.json();
      setSettings(data.settings);
      setNumericDrafts(getNumericDrafts(data.settings));

      const message = data.cleanup.deletedCount > 0
        ? `Einstellungen gespeichert. ${data.cleanup.deletedCount} Dateien gelöscht (${formatBytes(data.cleanup.freedBytes)} freigemacht).`
        : "Einstellungen gespeichert.";

      setSuccessMessage(message);
      setState("success");

      if (resetStateTimeoutRef.current !== null) {
        window.clearTimeout(resetStateTimeoutRef.current);
      }

      resetStateTimeoutRef.current = window.setTimeout(() => {
        setState("idle");
        resetStateTimeoutRef.current = null;
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  };

  const handleChange = <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const handleNumberChange = <K extends keyof Settings>(
    key: K,
    inputValue: string,
  ) => {
    if (!numericDrafts || !numericSettingsKeys.includes(key as NumericSettingsKey)) {
      return;
    }

    const numericKey = key as NumericSettingsKey;

    setNumericDrafts((prev) =>
      prev
        ? {
            ...prev,
            [numericKey]: inputValue,
          }
        : prev,
    );

    const parsed = parseInt(inputValue, 10);

    if (!Number.isNaN(parsed) && parsed >= 0) {
      handleChange(key, parsed as never);
    }
  };

  if (!settings || !numericDrafts) {
    return <div className="text-center py-8">Einstellungen werden geladen...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Player Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Player-Einstellungen</h3>
        
        <div>
          <label htmlFor="playerSlideDurationMs" className="block text-sm font-medium text-slate-700">
            Anzeigedauer pro Bild (ms)
          </label>
          <input
            id="playerSlideDurationMs"
            name="playerSlideDurationMs"
            type="number"
            value={numericDrafts.playerSlideDurationMs}
            onChange={(e) =>
              handleNumberChange("playerSlideDurationMs", e.target.value)
            }
            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
          />
          <p className="mt-1 text-xs text-slate-600">Standard: 8000ms (8 Sekunden)</p>
        </div>

        <div>
          <label htmlFor="playerRandomOrder" className="flex items-center gap-3">
            <input
              id="playerRandomOrder"
              name="playerRandomOrder"
              type="checkbox"
              checked={settings.playerRandomOrder}
              onChange={(e) => handleChange("playerRandomOrder", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700">
              Zufällige Reihenfolge
            </span>
          </label>
        </div>

      </div>

      {/* Storage Management */}
      <div className="space-y-4 border-t pt-6">
        <h3 className="text-lg font-semibold text-slate-900">Speicherverwaltung</h3>

        <div>
          <label htmlFor="storageCleanupEnabled" className="flex items-center gap-3">
            <input
              id="storageCleanupEnabled"
              name="storageCleanupEnabled"
              type="checkbox"
              checked={settings.storageCleanupEnabled}
              onChange={(e) => handleChange("storageCleanupEnabled", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm font-medium text-slate-700">
              Automatische Bereinigung aktivieren
            </span>
          </label>
        </div>

        <div>
          <label htmlFor="storageMaxBytes" className="block text-sm font-medium text-slate-700">
            Max. Speicher (Bytes) · 0 = unbegrenzt
          </label>
          <input
            id="storageMaxBytes"
            name="storageMaxBytes"
            type="number"
            value={numericDrafts.storageMaxBytes}
            onChange={(e) =>
              handleNumberChange("storageMaxBytes", e.target.value)
            }
            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
          />
          <p className="mt-1 text-xs text-slate-600">
            Standard: 1.000.000.000 Bytes (~1 GB)
          </p>
        </div>

        <div>
          <label htmlFor="storageMaxDays" className="block text-sm font-medium text-slate-700">
            Max. Aufbewahrung (Tage) · 0 = unbegrenzt
          </label>
          <input
            id="storageMaxDays"
            name="storageMaxDays"
            type="number"
            value={numericDrafts.storageMaxDays}
            onChange={(e) =>
              handleNumberChange("storageMaxDays", e.target.value)
            }
            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
          />
          <p className="mt-1 text-xs text-slate-600">Standard: 365 Tage (1 Jahr)</p>
        </div>

        <div>
          <label htmlFor="storageMaxFiles" className="block text-sm font-medium text-slate-700">
            Max. Anzahl Bilder · 0 = unbegrenzt
          </label>
          <input
            id="storageMaxFiles"
            name="storageMaxFiles"
            type="number"
            value={numericDrafts.storageMaxFiles}
            onChange={(e) =>
              handleNumberChange("storageMaxFiles", e.target.value)
            }
            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
          />
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={state === "loading"}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {state === "loading" ? "Speichern..." : "Einstellungen speichern"}
      </button>
    </form>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
