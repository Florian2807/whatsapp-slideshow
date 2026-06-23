import crypto from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { appConfig } from "@/lib/config";
import { createSessionToken, verifySessionToken } from "@/lib/session-token";

function getPassword() {
  const password = process.env.APP_PASSWORD;

  if (!password) {
    throw new Error("APP_PASSWORD is required. Copy .env.example and set a dashboard password.");
  }

  return password;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyPassword(value: string) {
  return safeEqual(value, getPassword());
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return verifySessionToken(
    cookieStore.get(appConfig.loginCookieName)?.value,
  );
}

export async function requireSession() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}

export async function createSession() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: appConfig.loginCookieName,
    value: createSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: appConfig.sessionMaxAgeSeconds,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(appConfig.loginCookieName);
}
