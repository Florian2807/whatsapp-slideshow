import { redirect } from "next/navigation";

import { isAuthenticated } from "@/lib/auth";
import { ensureWhatsAppAutostart } from "@/lib/whatsapp";

export default async function HomePage() {
  ensureWhatsAppAutostart();
  redirect((await isAuthenticated()) ? "/dashboard" : "/login");
}
