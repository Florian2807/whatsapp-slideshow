/* eslint-disable @next/next/no-img-element */

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { MediaItem } from "@/lib/media-store";

type SlideshowPlayerProps = {
  initialItems: MediaItem[];
  slideDurationMs: number;
  pollIntervalMs: number;
  randomOrder: boolean;
};

function haveSameItems(left: MediaItem[], right: MediaItem[]) {
  if (left.length !== right.length) {
    return false;
  }

  const leftIds = [...left.map((item) => item.id)].sort((a, b) => a - b);
  const rightIds = [...right.map((item) => item.id)].sort((a, b) => a - b);

  return leftIds.every((id, index) => id === rightIds[index]);
}

function shuffleItems(items: MediaItem[]) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [
      nextItems[swapIndex],
      nextItems[index],
    ];
  }

  return nextItems;
}

function prepareRoundItems(items: MediaItem[], randomOrder: boolean) {
  return randomOrder ? shuffleItems(items) : items;
}

export function SlideshowPlayer({
  initialItems,
  slideDurationMs,
  pollIntervalMs,
  randomOrder,
}: SlideshowPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [roundItems, setRoundItems] = useState(() =>
    prepareRoundItems(initialItems, randomOrder),
  );
  const [pendingItems, setPendingItems] = useState<MediaItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const roundItemsRef = useRef(prepareRoundItems(initialItems, randomOrder));
  const pendingItemsRef = useRef<MediaItem[] | null>(null);

  useEffect(() => {
    roundItemsRef.current = roundItems;
  }, [roundItems]);

  useEffect(() => {
    pendingItemsRef.current = pendingItems;
  }, [pendingItems]);

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, []);

  async function enterFullscreen() {
    if (!containerRef.current || !document.fullscreenEnabled) {
      setFullscreenError("Dieser Browser unterstuetzt keinen Fullscreen-Modus.");
      return;
    }

    try {
      await containerRef.current.requestFullscreen({ navigationUI: "hide" });
      setFullscreenError(null);
    } catch {
      setFullscreenError(
        "Der Browser hat den Fullscreen blockiert. Bitte den Button direkt antippen oder anklicken.",
      );
    }
  }

  useEffect(() => {
    async function loadQueue() {
      const response = await fetch("/api/media?scope=player", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const nextItems = (await response.json()) as MediaItem[];
      const preparedItems = prepareRoundItems(nextItems, randomOrder);

      if (haveSameItems(roundItemsRef.current, nextItems)) {
        setPendingItems(null);
        return;
      }

      if (roundItemsRef.current.length === 0) {
        roundItemsRef.current = preparedItems;
        setRoundItems(preparedItems);
        setPendingItems(null);
        setIndex(0);
        return;
      }

      pendingItemsRef.current = preparedItems;
      setPendingItems(preparedItems);
    }

    void loadQueue();

    const interval = window.setInterval(() => {
      void loadQueue();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [pollIntervalMs, randomOrder]);

  useEffect(() => {
    if (roundItems.length === 0) {
      return;
    }

    const interval = window.setInterval(() => {
      setIndex((currentIndex) => {
        const activeRound = roundItemsRef.current;

        if (activeRound.length === 0) {
          return 0;
        }

        const nextIndex = currentIndex + 1;

        if (nextIndex < activeRound.length) {
          return nextIndex;
        }

        const queuedItems = pendingItemsRef.current;

        if (queuedItems) {
          roundItemsRef.current = queuedItems;
          pendingItemsRef.current = null;
          setRoundItems(queuedItems);
          setPendingItems(null);
        }

        return 0;
      });
    }, slideDurationMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [roundItems.length, slideDurationMs]);

  const safeIndex =
    roundItems.length === 0 ? 0 : Math.min(index, roundItems.length - 1);
  const currentItem = roundItems[safeIndex] ?? null;
  const displayedTotal = pendingItems?.length ?? roundItems.length;
  const displayedPosition =
    displayedTotal === 0 ? 0 : Math.min(safeIndex + 1, displayedTotal);

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white"
    >
      {currentItem ? (
        <img
          key={currentItem.id}
          src={currentItem.url}
          alt={currentItem.originalName ?? currentItem.fileName}
          className="h-screen w-screen object-contain"
          onError={() => {
            setIndex((currentIndex) => {
              if (currentIndex >= roundItemsRef.current.length - 1) {
                return 0;
              }

              return currentIndex + 1;
            });
          }}
        />
      ) : (
        <div className="flex max-w-lg flex-col items-center gap-4 px-8 text-center text-zinc-300">
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
            Player wartet
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            Noch keine sichtbaren Bilder
          </h1>
          <p className="text-base leading-7 text-zinc-400">
            Sobald in der Bibliothek ein sichtbares Bild liegt, startet die Diashow automatisch.
          </p>
        </div>
      )}

      {!isFullscreen ? (
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/80 via-black/15 to-transparent p-6 sm:p-10">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-black/65 p-6 text-center shadow-2xl shadow-black/40 backdrop-blur">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                Vollbildmodus
              </p>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                Player im echten Fullscreen starten
              </h2>
              <p className="text-sm leading-6 text-zinc-300 sm:text-base">
                Der Browser blendet seine Leisten aus und zeigt nur noch die Diashow an.
                Zum Verlassen reicht spaeter <code className="rounded bg-white/10 px-1.5 py-0.5 text-zinc-100">Esc</code>.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  void enterFullscreen();
                }}
                className="rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
              >
                Vollbild starten
              </button>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/10 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.12]"
              >
                Zum Dashboard
              </Link>
            </div>

            {fullscreenError ? (
              <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                {fullscreenError}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {isFullscreen ? (
        <div className="pointer-events-none absolute left-5 top-5 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm font-medium text-zinc-100 backdrop-blur">
          {currentItem ? `${displayedPosition} / ${displayedTotal}` : "0 / 0"}
        </div>
      ) : null}

    </div>
  );
}
