import { createSession, verifyPassword } from "@/lib/auth";
import { normalizeRedirectTarget } from "@/lib/redirect-target";

function invalidPasswordResponse() {
  return Response.json(
    { error: "Das Passwort ist nicht korrekt." },
    { status: 401 },
  );
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let password = "";
  let redirectTo = "/player";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      password?: unknown;
      redirectTo?: unknown;
    };

    password = typeof body.password === "string" ? body.password : "";
    redirectTo = normalizeRedirectTarget(
      typeof body.redirectTo === "string" ? body.redirectTo : null,
      "/player",
    );
  } else {
    const formData = await request.formData();

    password = String(formData.get("password") ?? "");
    redirectTo = normalizeRedirectTarget(
      typeof formData.get("redirectTo") === "string"
        ? String(formData.get("redirectTo"))
        : null,
      "/player",
    );
  }

  if (!verifyPassword(password)) {
    return invalidPasswordResponse();
  }

  await createSession();

  if (contentType.includes("application/json")) {
    return Response.json({ ok: true, redirectTo });
  }

  return Response.redirect(new URL(redirectTo, request.url), 303);
}
