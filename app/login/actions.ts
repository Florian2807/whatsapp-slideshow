"use server";

import { redirect } from "next/navigation";

import { createSession, verifyPassword } from "@/lib/auth";
import { normalizeRedirectTarget } from "@/lib/redirect-target";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _state: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = normalizeRedirectTarget(
    typeof formData.get("next") === "string"
      ? String(formData.get("next"))
      : null,
  );

  if (!password) {
    return { error: "Bitte gib dein Passwort ein." };
  }

  if (!verifyPassword(password)) {
    return { error: "Das Passwort ist nicht korrekt." };
  }

  await createSession();
  redirect(next);
}
