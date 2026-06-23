/* eslint-disable @next/next/no-img-element */

"use client";

import { useEffect, useState, useTransition } from "react";

type WhatsAppStatus = {
  state:
    | "idle"
    | "initializing"
    | "qr"
    | "authenticated"
    | "ready"
    | "disconnected"
    | "error"
    | "stopped";
  isRunning: boolean;
  qrDataUrl: string | null;
  lastError: string | null;
  lastEventAt: string | null;
  importedCount: number;
  lastImportedAt: string | null;
  lastImportedSender: string | null;
  account: {
    wid: string | null;
    pushname: string | null;
    platform: string | null;
  };
};

const stateLabel: Record<WhatsAppStatus["state"], string> = {
  idle: "Inaktiv",
  initializing: "Startet",
  qr: "QR bereit",
  authenticated: "Authentifiziert",
  ready: "Verbunden",
  disconnected: "Getrennt",
  error: "Fehler",
  stopped: "Gestoppt",
};

export function WhatsAppPanel() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const response = await fetch("/api/whatsapp", { cache: "no-store" });
        const data = (await response.json()) as WhatsAppStatus | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data && data.error ? data.error : "WhatsApp-Status konnte nicht geladen werden.",
          );
        }

        if (isMounted) {
          setStatus(data as WhatsAppStatus);
          setError(null);
        }
      } catch (nextError) {
        if (isMounted) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "WhatsApp-Status konnte nicht geladen werden.",
          );
        }
      }
    }

    void loadStatus();
    const interval = window.setInterval(() => {
      void loadStatus();
    }, 5_000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  function triggerAction(action: "start" | "restart" | "stop") {
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          });
          const data = (await response.json()) as WhatsAppStatus | { error?: string };

          if (!response.ok) {
            throw new Error(
              "error" in data && data.error ? data.error : "WhatsApp-Aktion fehlgeschlagen.",
            );
          }

          setStatus(data as WhatsAppStatus);
          setError(null);
        } catch (nextError) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "WhatsApp-Aktion fehlgeschlagen.",
          );
        }
      })();
    });
  }

  return (
    <section className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">WhatsApp-Empfang</h2>
            <p className="mt-1 text-sm text-slate-600">
              Bilder direkt aus WhatsApp in die Bibliothek uebernehmen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => triggerAction("start")}
              disabled={isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              Starten
            </button>
            <button
              type="button"
              onClick={() => triggerAction("restart")}
              disabled={isPending}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Neu verbinden
            </button>
            <button
              type="button"
              onClick={() => triggerAction("stop")}
              disabled={isPending}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
            >
              Stoppen
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Status</span>
            <span className={getStateClassName(status?.state)}>
              {status ? stateLabel[status.state] : "Wird geladen"}
            </span>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Importierte Bilder
              </dt>
              <dd className="mt-2 text-2xl font-bold text-slate-900">
                {status?.importedCount ?? 0}
              </dd>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Letzter Empfang
              </dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">
                {formatDateTime(status?.lastImportedAt)}
              </dd>
              <p className="mt-1 text-xs text-slate-500">
                {status?.lastImportedSender ?? "Noch kein Bild empfangen"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Verbundenes Konto
              </dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">
                {status?.account.pushname ?? status?.account.wid ?? "Nicht verbunden"}
              </dd>
              <p className="mt-1 text-xs text-slate-500">
                {status?.account.platform ?? "WhatsApp Web"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Letztes Ereignis
              </dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">
                {formatDateTime(status?.lastEventAt)}
              </dd>
            </div>
          </dl>

          <p className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Falls kein eingebauter Chromium-Browser vorhanden ist, setze optional
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-sky-950">
              PUPPETEER_EXECUTABLE_PATH
            </code>
            auf deine Chrome-Installation.
          </p>

          {error || status?.lastError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error ?? status?.lastError}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            QR-Verbindung
          </h3>

          {status?.qrDataUrl ? (
            <div className="mt-4 space-y-4 text-center">
              <img
                src={status.qrDataUrl}
                alt="WhatsApp QR-Code"
                className="mx-auto w-full max-w-[18rem] rounded-lg border border-slate-200 bg-white p-3"
              />
              <p className="text-sm text-slate-600">
                In WhatsApp unter <strong>Verknuepfte Geraete</strong> scannen.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
              {status?.state === "ready"
                ? "WhatsApp ist verbunden."
                : "Starte den Bot, um einen QR-Code anzuzeigen."}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function getStateClassName(state: WhatsAppStatus["state"] | undefined) {
  switch (state) {
    case "ready":
      return "inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700";
    case "qr":
    case "authenticated":
    case "initializing":
      return "inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700";
    case "error":
    case "disconnected":
      return "inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700";
    default:
      return "inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700";
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Noch nichts";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
