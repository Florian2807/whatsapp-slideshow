/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

import {
  deleteMediaAction,
  hideMediaAction,
  logoutAction,
  uploadMediaAction,
} from "@/app/dashboard/actions";
import { RefreshTicker } from "@/app/dashboard/refresh-ticker";
import { WhatsAppPanel } from "@/app/dashboard/whatsapp-panel";
import { requireSession } from "@/lib/auth";
import { appConfig } from "@/lib/config";
import { formatBytes, formatDateTime } from "@/lib/format";
import { getDashboardSummary, listMedia } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireSession();

  const [summary, media] = await Promise.all([
    getDashboardSummary(),
    listMedia({ includeHidden: true }),
  ]);

  const latestItem = media.length > 0 ? media[media.length - 1] : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <RefreshTicker intervalMs={appConfig.dashboardRefreshMs} />

      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {appConfig.appName}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Verwalte deine Bildergalerie und starte die Diashow
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/player"
                target="_blank"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Player öffnen
              </Link>
              <Link
                href="/dashboard/settings"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Einstellungen
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Abmelden
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <WhatsAppPanel />

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Alle Bilder</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {summary.total}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Im Player aktiv</p>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  {summary.visible}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Ausgeblendet</p>
                <p className="mt-2 text-3xl font-bold text-amber-600">
                  {summary.hidden}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                <svg
                  className="h-6 w-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Speicher</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {formatBytes(summary.totalBytes)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
                <svg
                  className="h-6 w-6 text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Latest Image & Upload */}
        <div className="mb-8 grid gap-8 lg:grid-cols-3">
          {/* Latest Image */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Neuester Eingang
                </h2>
              </div>
              {latestItem ? (
                <div className="p-6">
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <img
                      src={latestItem.url}
                      alt={latestItem.originalName ?? latestItem.fileName}
                      className="aspect-video w-full object-cover"
                    />
                  </div>
                  <div className="mt-6 space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">
                        {latestItem.originalName ?? latestItem.fileName}
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            latestItem.hidden
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {latestItem.hidden ? "Ausgeblendet" : "Sichtbar"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
                          {latestItem.mimeType.replace("image/", "").toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p>
                        <strong>Eingegangen:</strong> {formatDateTime(latestItem.createdAt)}
                      </p>
                      <p>
                        <strong>Größe:</strong> {formatBytes(latestItem.sizeBytes)}
                      </p>
                      <p>
                        <strong>Dateiname:</strong> {latestItem.fileName}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <svg
                      className="h-6 w-6 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-slate-900">
                    Noch kein Bild vorhanden
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Lege Dateien in <code className="rounded bg-slate-100 px-2 py-1 text-slate-700">data/library</code> ab oder nutze
                    unten den Upload.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upload */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">Test-Upload</h2>
            </div>
            <form action={uploadMediaAction} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Datei wählen
                </label>
                <input
                  type="file"
                  name="media"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-200"
                />
              </div>
              <p className="text-xs text-slate-600">
                Unterstützte Formate: JPG, PNG, WebP, GIF
              </p>
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Hochladen
              </button>
            </form>
          </div>
        </div>

        {/* Gallery */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Galerie</h2>
            <p className="mt-1 text-sm text-slate-600">
              {media.length} Bilder · Chronologisch sortiert
            </p>
          </div>

          {media.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <svg
                  className="h-6 w-6 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-slate-900">
                Keine Bilder gefunden
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Laden Sie oben ein Bild hoch oder legen Sie Dateien in{" "}
                <code className="rounded bg-slate-100 px-2 py-1 text-slate-700">
                  data/library
                </code>{" "}
                ab.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {media.map((item) => {
                const toggleHidden = hideMediaAction.bind(null, item.id, !item.hidden);
                const deleteItem = deleteMediaAction.bind(null, item.id);

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50"
                  >
                    {/* Thumbnail */}
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      <img
                        src={item.url}
                        alt={item.originalName ?? item.fileName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        {item.originalName ?? item.fileName}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            item.hidden
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {item.hidden ? "Ausgeblendet" : "Sichtbar"}
                        </span>
                        <span className="text-xs text-slate-600">
                          {formatDateTime(item.createdAt)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatBytes(item.sizeBytes)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <form action={toggleHidden}>
                        <button
                          type="submit"
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          {item.hidden ? "Einblenden" : "Ausblenden"}
                        </button>
                      </form>
                      <form action={deleteItem}>
                        <button
                          type="submit"
                          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                        >
                          Löschen
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
