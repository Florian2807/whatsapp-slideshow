import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { appConfig } from "@/lib/config";
import { verifySessionToken } from "@/lib/session-token";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(appConfig.loginCookieName)?.value;

  if (verifySessionToken(token)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/player/:path*"],
};
