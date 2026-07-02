import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import QRCode from "qrcode";
import {
  Client,
  LocalAuth,
  type ClientInfo,
  type Message,
  type MessageMedia,
} from "whatsapp-web.js";

import { appConfig, type AllowedMimeType } from "@/lib/config";
import { importMediaBuffer } from "@/lib/media-store";

type WhatsAppState =
  | "idle"
  | "initializing"
  | "qr"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "error"
  | "stopped";

export type WhatsAppStatus = {
  state: WhatsAppState;
  isRunning: boolean;
  qrDataUrl: string | null;
  lastError: string | null;
  lastEventAt: string | null;
  importedCount: number;
  lastImportedAt: string | null;
  lastImportedSender: string | null;
  account: {
    wid: string | null;
    pushname: string | null;
    platform: string | null;
  };
};

type RuntimeState = {
  state: WhatsAppState;
  lastError: string | null;
  lastEventAt: string | null;
  importedCount: number;
  lastImportedAt: string | null;
  lastImportedSender: string | null;
  qrText: string | null;
  qrDataUrl: string | null;
  qrDataUrlSource: string | null;
  account: WhatsAppStatus["account"];
};

type RuntimeInstance = {
  client: Client | null;
  initializePromise: Promise<void> | null;
  stopPromise: Promise<void> | null;
  state: RuntimeState;
};

declare global {
  var __whatsappRuntime__: RuntimeInstance | undefined;
}

function createInitialState(): RuntimeState {
  return {
    state: "idle",
    lastError: null,
    lastEventAt: null,
    importedCount: 0,
    lastImportedAt: null,
    lastImportedSender: null,
    qrText: null,
    qrDataUrl: null,
    qrDataUrlSource: null,
    account: {
      wid: null,
      pushname: null,
      platform: null,
    },
  };
}

function getRuntime() {
  if (!globalThis.__whatsappRuntime__) {
    globalThis.__whatsappRuntime__ = {
      client: null,
      initializePromise: null,
      stopPromise: null,
      state: createInitialState(),
    };
  }

  return globalThis.__whatsappRuntime__;
}

function markState(next: Partial<RuntimeState>) {
  const runtime = getRuntime();
  runtime.state = {
    ...runtime.state,
    ...next,
    lastEventAt: new Date().toISOString(),
  };
}

function getWhatsAppAuthPath() {
  return path.join(appConfig.dataDir, "whatsapp-auth");
}

function ensureWhatsAppStorage() {
  const authPath = getWhatsAppAuthPath();

  if (!existsSync(authPath)) {
    mkdirSync(authPath, { recursive: true });
  }
}

function getPreferredBrowserPath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  ].filter((value): value is string => Boolean(value));

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function applyClientInfo(info: ClientInfo | undefined) {
  if (!info) {
    return;
  }

  markState({
    account: {
      wid: info.wid?._serialized ?? null,
      pushname: info.pushname ?? null,
      platform: info.platform ?? null,
    },
  });
}

async function handleIncomingMessage(message: Message) {
  if (message.fromMe || !message.hasMedia) {
    return;
  }

  const chat = await message.getChat();

  if (chat.isGroup) {
    return;
  }

  const media = (await message.downloadMedia()) as MessageMedia | undefined;

  if (!media || !media.mimetype.startsWith("image/")) {
    return;
  }

  if (!(media.mimetype in appConfig.allowedMimeTypes)) {
    return;
  }

  const mimeType = media.mimetype as AllowedMimeType;
  const buffer = Buffer.from(media.data, "base64");
  const createdAt =
    typeof message.timestamp === "number"
      ? new Date(message.timestamp * 1000)
      : new Date();
  const sender = message.author ?? message.from;

  await importMediaBuffer({
    buffer,
    mimeType,
    originalName: media.filename ?? null,
    sender,
    createdAt,
  });

  const runtime = getRuntime();
  markState({
    importedCount: runtime.state.importedCount + 1,
    lastImportedAt: new Date().toISOString(),
    lastImportedSender: sender,
  });

  await Promise.allSettled([
    message.react("✅"),
    chat.sendSeen(),
  ]);
}

function createClient() {
  ensureWhatsAppStorage();

  const executablePath = getPreferredBrowserPath();

  return new Client({
    authStrategy: new LocalAuth({
      clientId: "slideshow",
      dataPath: getWhatsAppAuthPath(),
    }),
    puppeteer: {
      headless: true,
      executablePath: executablePath ?? undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    },
  });
}

function bindClientEvents(client: Client) {
  client.on("qr", (qr) => {
    markState({
      state: "qr",
      lastError: null,
      qrText: qr,
      qrDataUrl: null,
      qrDataUrlSource: null,
    });
  });

  client.on("authenticated", () => {
    markState({
      state: "authenticated",
      lastError: null,
    });
  });

  client.on("ready", () => {
    applyClientInfo(client.info);
    markState({
      state: "ready",
      lastError: null,
      qrText: null,
      qrDataUrl: null,
      qrDataUrlSource: null,
    });
  });

  client.on("auth_failure", (message) => {
    markState({
      state: "error",
      lastError: message,
      qrText: null,
      qrDataUrl: null,
      qrDataUrlSource: null,
    });
  });

  client.on("disconnected", (reason) => {
    const runtime = getRuntime();

    runtime.client = null;
    runtime.initializePromise = null;

    markState({
      state: "disconnected",
      lastError: String(reason),
      qrText: null,
      qrDataUrl: null,
      qrDataUrlSource: null,
      account: createInitialState().account,
    });
  });

  client.on("message", (message) => {
    void handleIncomingMessage(message).catch((error) => {
      markState({
        state: "error",
        lastError: error instanceof Error ? error.message : "Media import failed.",
      });
    });
  });
}

export async function startWhatsApp() {
  const runtime = getRuntime();

  if (runtime.client) {
    return getWhatsAppStatus();
  }

  if (!runtime.initializePromise) {
    const client = createClient();
    bindClientEvents(client);
    runtime.client = client;
    markState({ state: "initializing", lastError: null });

    runtime.initializePromise = client.initialize().catch((error) => {
      runtime.client = null;
      runtime.initializePromise = null;
      markState({
        state: "error",
        lastError:
          error instanceof Error
            ? error.message
            : "WhatsApp konnte nicht gestartet werden.",
      });
      throw error;
    });
  }

  await runtime.initializePromise.catch(() => undefined);
  return getWhatsAppStatus();
}

export async function stopWhatsApp() {
  const runtime = getRuntime();

  if (runtime.stopPromise) {
    await runtime.stopPromise;
    return getWhatsAppStatus();
  }

  if (!runtime.client) {
    markState({
      state: "stopped",
      lastError: null,
      qrText: null,
      qrDataUrl: null,
      qrDataUrlSource: null,
      account: createInitialState().account,
    });
    return getWhatsAppStatus();
  }

  const client = runtime.client;
  runtime.stopPromise = client
    .destroy()
    .catch((error) => {
      markState({
        state: "error",
        lastError:
          error instanceof Error
            ? error.message
            : "WhatsApp konnte nicht gestoppt werden.",
      });
      throw error;
    })
    .finally(() => {
      runtime.client = null;
      runtime.initializePromise = null;
      runtime.stopPromise = null;
      markState({
        state: "stopped",
        qrText: null,
        qrDataUrl: null,
        qrDataUrlSource: null,
        account: createInitialState().account,
      });
    });

  await runtime.stopPromise;
  return getWhatsAppStatus();
}

export async function restartWhatsApp() {
  await stopWhatsApp();
  return startWhatsApp();
}

export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  const runtime = getRuntime();
  const { state } = runtime;

  if (state.qrText && state.qrDataUrlSource !== state.qrText) {
    state.qrDataUrl = await QRCode.toDataURL(state.qrText, {
      margin: 1,
      width: 320,
    });
    state.qrDataUrlSource = state.qrText;
  }

  return {
    state: state.state,
    isRunning: runtime.client !== null,
    qrDataUrl: state.qrDataUrl,
    lastError: state.lastError,
    lastEventAt: state.lastEventAt,
    importedCount: state.importedCount,
    lastImportedAt: state.lastImportedAt,
    lastImportedSender: state.lastImportedSender,
    account: state.account,
  };
}
