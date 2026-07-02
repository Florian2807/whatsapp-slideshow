import { createSession, verifyPassword } from "@/lib/auth";
import { normalizeRedirectTarget } from "@/lib/redirect-target";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get("password") ?? "";
  const redirectTo = normalizeRedirectTarget(
    searchParams.get("redirectTo"),
    "/player",
  );

  if (!verifyPassword(password)) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: `/login?next=${encodeURIComponent(redirectTo)}`,
      },
    });
  }

  await createSession();

  return new Response(null, {
    status: 303,
    headers: {
      Location: redirectTo,
    },
  });
}
