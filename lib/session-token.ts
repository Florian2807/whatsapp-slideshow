import crypto from "node:crypto";

type SessionPayload = {
  authenticated: true;
  issuedAt: number;
};

function getSessionSecret() {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    throw new Error(
      "SESSION_SECRET is required. Copy .env.example and set a long random secret.",
    );
  }

  return sessionSecret;
}

function encodePayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(value: string) {
  try {
    return JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as SessionPayload;
  } catch {
    return null;
  }
}

function signValue(value: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionToken() {
  const payload = encodePayload({ authenticated: true, issuedAt: Date.now() });
  return `${payload}.${signValue(payload)}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature || !safeEqual(signature, signValue(payload))) {
    return false;
  }

  const decoded = decodePayload(payload);
  return decoded?.authenticated === true;
}
