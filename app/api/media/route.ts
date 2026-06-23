import { NextResponse } from "next/server";

import { isAuthenticated, requireSession } from "@/lib/auth";
import { listMedia } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  if (scope === "dashboard") {
    await requireSession();
  } else if (!(await isAuthenticated())) {
    return NextResponse.json(await listMedia(), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const includeHidden = scope === "dashboard";
  const media = await listMedia({ includeHidden });

  return NextResponse.json(media, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
