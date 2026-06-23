import { SlideshowPlayer } from "@/app/player/slideshow-player";
import { appConfig } from "@/lib/config";
import { listMedia } from "@/lib/media-store";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function PlayerPage() {
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
