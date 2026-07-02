import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { SettingsForm } from "@/app/dashboard/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireSession();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Einstellungen</h1>
              <p className="mt-1 text-sm text-slate-600">
                Konfiguriere Player, Speicher und Monitoring
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Zurück
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="px-4 py-6 sm:px-6 sm:py-8">
            <SettingsForm />
          </div>
        </div>
      </div>
    </main>
  );
}
