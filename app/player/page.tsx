import { redirect } from "next/navigation";

import { SlideshowPlayer } from "@/app/player/slideshow-player";
import { isAuthenticated } from "@/lib/auth";
import { appConfig } from "@/lib/config";
import { listMedia } from "@/lib/media-store";
import { getSettings } from "@/lib/settings";
import { ensureWhatsAppAutostart } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

type PlayerPageProps = {
  searchParams: Promise<{
    password?: string;
  }>;
};

export default async function PlayerPage({ searchParams }: PlayerPageProps) {
  const resolvedSearchParams = await searchParams;
  ensureWhatsAppAutostart();

  if (!(await isAuthenticated())) {
    if (typeof resolvedSearchParams.password === "string") {
      redirect(
        `/api/player-login?password=${encodeURIComponent(resolvedSearchParams.password)}&redirectTo=%2Fplayer`,
      );
    }

    redirect("/login?next=%2Fplayer");
  }

  const [visibleItems, settings] = await Promise.all([
    listMedia(),
    getSettings(),
  ]);

  return (
    <main className="min-h-screen bg-black">
      <SlideshowPlayer
        initialItems={visibleItems}
        slideDurationMs={settings.playerSlideDurationMs}
        randomOrder={settings.playerRandomOrder}
        pollIntervalMs={appConfig.playerRefreshMs}
      />
    </main>
  );
}
