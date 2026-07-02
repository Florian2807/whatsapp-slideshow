import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { isAuthenticated } from "@/lib/auth";
import { appConfig } from "@/lib/config";
import { normalizeRedirectTarget } from "@/lib/redirect-target";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const next = normalizeRedirectTarget(resolvedSearchParams.next);

  if (await isAuthenticated()) {
    redirect(next);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_32%),linear-gradient(180deg,_#0f172a,_#020617_68%)] px-6 py-16 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="mb-8 space-y-3">
          <span className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-sky-200">
            Raspberry Dashboard
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">
            {appConfig.appName}
          </h1>
          <p className="text-sm leading-6 text-zinc-300">
            Ein Passwort schuetzt Dashboard und Player im Heimnetz. Standardmaessig
            erwartet die App spaeter Bilder im Ordner <code className="rounded bg-white/10 px-1.5 py-0.5 text-zinc-100">data/library</code>.
          </p>
        </div>

        <LoginForm next={next} />
      </section>
    </main>
  );
}
