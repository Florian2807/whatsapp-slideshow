"use server";

import { redirect } from "next/navigation";

import { createSession, verifyPassword } from "@/lib/auth";

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _state: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");

  if (!password) {
    return { error: "Bitte gib dein Passwort ein." };
  }

  if (!verifyPassword(password)) {
    return { error: "Das Passwort ist nicht korrekt." };
  }

  await createSession();
  redirect("/dashboard");
}
