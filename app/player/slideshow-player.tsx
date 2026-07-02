/* eslint-disable @next/next/no-img-element */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { MediaItem } from "@/lib/media-store";

type SlideshowPlayerProps = {
  initialItems: MediaItem[];
  slideDurationMs: number;
  pollIntervalMs: number;
  randomOrder: boolean;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: (() => Promise<void>) | (() => void);
  mozFullScreenElement?: Element | null;
  mozFullScreenEnabled?: boolean;
  msFullscreenElement?: Element | null;
  msFullscreenEnabled?: boolean;
};

type FullscreenContainerElement = HTMLDivElement & {
  webkitRequestFullscreen?: (() => Promise<void>) | (() => void);
  mozRequestFullScreen?: (() => Promise<void>) | (() => void);
  msRequestFullscreen?: (() => Promise<void>) | (() => void);
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

function getFullscreenElement(documentRef: FullscreenDocument) {
  return (
    documentRef.fullscreenElement ??
    documentRef.webkitFullscreenElement ??
    documentRef.mozFullScreenElement ??
    documentRef.msFullscreenElement ??
    null
  );
}

function isFullscreenEnabled(documentRef: FullscreenDocument) {
  return Boolean(
    documentRef.fullscreenEnabled ??
      documentRef.webkitFullscreenEnabled ??
      documentRef.mozFullScreenEnabled ??
      documentRef.msFullscreenEnabled,
  );
}

async function requestElementFullscreen(element: FullscreenContainerElement) {
  if (element.requestFullscreen) {
    await element.requestFullscreen();
    return;
  }

  if (element.webkitRequestFullscreen) {
    await element.webkitRequestFullscreen();
    return;
  }

  if (element.mozRequestFullScreen) {
    await element.mozRequestFullScreen();
    return;
  }

  if (element.msRequestFullscreen) {
    await element.msRequestFullscreen();
    return;
  }

  throw new Error("Fullscreen unsupported");
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

  const activatePendingItems = useCallback((): boolean => {
    const queuedItems = pendingItemsRef.current;

    if (!queuedItems) {
      return false;
    }

    roundItemsRef.current = queuedItems;
    pendingItemsRef.current = null;
    setRoundItems(queuedItems);
    setPendingItems(null);
    return true;
  }, []);

  const moveToNext = useCallback(() => {
    setIndex((currentIndex) => {
      const activeRound = roundItemsRef.current;

      if (activeRound.length === 0) {
        return 0;
      }

      const nextIndex = currentIndex + 1;

      if (nextIndex < activeRound.length) {
        return nextIndex;
      }

      if (activatePendingItems()) {
        return 0;
      }

      return 0;
    });
  }, [activatePendingItems]);

  const moveToPrevious = useCallback(() => {
    setIndex((currentIndex) => {
      const activeRound = roundItemsRef.current;

      if (activeRound.length === 0) {
        return 0;
      }

      if (currentIndex > 0) {
        return currentIndex - 1;
      }

      return activeRound.length - 1;
    });
  }, []);

  useEffect(() => {
    roundItemsRef.current = roundItems;
  }, [roundItems]);

  useEffect(() => {
    pendingItemsRef.current = pendingItems;
  }, [pendingItems]);

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(
        getFullscreenElement(document as FullscreenDocument) ===
          containerRef.current,
      );
    }

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    document.addEventListener("mozfullscreenchange", syncFullscreenState);
    document.addEventListener("MSFullscreenChange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener(
        "webkitfullscreenchange",
        syncFullscreenState,
      );
      document.removeEventListener("mozfullscreenchange", syncFullscreenState);
      document.removeEventListener("MSFullscreenChange", syncFullscreenState);
    };
  }, []);

  async function enterFullscreen() {
    const documentRef = document as FullscreenDocument;
    const element = containerRef.current as FullscreenContainerElement | null;

    if (!element || !isFullscreenEnabled(documentRef)) {
      setFullscreenError("Dieser Browser unterstuetzt keinen Fullscreen-Modus.");
      return;
    }

    try {
      await requestElementFullscreen(element);
      setFullscreenError(null);
    } catch {
      setFullscreenError(
        "Der Browser hat den Fullscreen blockiert. Bitte den Button direkt antippen oder anklicken.",
      );
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveToNext();
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveToPrevious();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [moveToNext, moveToPrevious]);

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
      moveToNext();
    }, slideDurationMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [moveToNext, roundItems.length, slideDurationMs]);

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
            Sobald in der Bibliothek ein sichtbares Bild liegt, startet die Slideshow automatisch.
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute left-5 top-5 rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm font-medium text-zinc-100 backdrop-blur">
        {currentItem ? `${displayedPosition} / ${displayedTotal}` : "0 / 0"}
      </div>

      <div className="absolute right-5 top-5 flex max-w-xs flex-col items-end gap-3">
        {!isFullscreen ? (
          <button
            type="button"
            onClick={() => {
              void enterFullscreen();
            }}
            className="rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm font-semibold text-zinc-100 backdrop-blur transition hover:bg-black/60"
          >
            Vollbild
          </button>
        ) : null}

        {fullscreenError ? (
          <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 backdrop-blur">
            {fullscreenError}
          </p>
        ) : null}
      </div>

    </div>
  );
}
