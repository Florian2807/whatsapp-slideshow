import { isAuthenticated } from "@/lib/auth";
import {
  getWhatsAppStatus,
  restartWhatsApp,
  startWhatsApp,
  stopWhatsApp,
} from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unauthorizedResponse() {
  return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const status = await getWhatsAppStatus();
    return Response.json(status);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return unauthorizedResponse();
  }

  try {
    const body = (await request.json().catch(() => null)) as
      | { action?: string }
      | null;

    switch (body?.action) {
      case "start": {
        const status = await startWhatsApp();
        return Response.json(status);
      }
      case "stop": {
        const status = await stopWhatsApp();
        return Response.json(status);
      }
      case "restart": {
        const status = await restartWhatsApp();
        return Response.json(status);
      }
      default:
        return Response.json(
          { error: "Unbekannte Aktion." },
          { status: 400 },
        );
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
