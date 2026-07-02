import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/auth";
import { listMedia } from "@/lib/media-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const scope = searchParams.get("scope");

  const includeHidden = scope === "dashboard";
  const media = await listMedia({ includeHidden });

  return NextResponse.json(media, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
