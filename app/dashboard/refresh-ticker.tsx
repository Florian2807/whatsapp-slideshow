"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type RefreshTickerProps = {
  intervalMs: number;
};

export function RefreshTicker({ intervalMs }: RefreshTickerProps) {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [intervalMs, router]);

  return null;
}
