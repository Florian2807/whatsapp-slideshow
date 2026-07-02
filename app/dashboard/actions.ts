"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearSession, requireSession } from "@/lib/auth";
import {
  deleteMedia,
  importUploadedFile,
  setMediaHidden,
} from "@/lib/media-store";

function getSelectedMediaIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("id")
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );
}

async function refreshViews() {
  revalidatePath("/dashboard");
  revalidatePath("/player");
}

export async function logoutAction() {
  await requireSession();
  await clearSession();
  redirect("/login");
}

export async function hideMediaAction(id: number, hidden: boolean) {
  await requireSession();
  await setMediaHidden(id, hidden);
  await refreshViews();
}

export async function deleteMediaAction(id: number) {
  await requireSession();
  await deleteMedia(id);
  await refreshViews();
}

export async function hideSelectedMediaAction(formData: FormData) {
  await requireSession();

  const ids = getSelectedMediaIds(formData);

  if (ids.length === 0) {
    return;
  }

  await Promise.all(ids.map(async (id) => setMediaHidden(id, true)));
  await refreshViews();
}

export async function deleteSelectedMediaAction(formData: FormData) {
  await requireSession();

  const ids = getSelectedMediaIds(formData);

  if (ids.length === 0) {
    return;
  }

  await Promise.all(ids.map(async (id) => deleteMedia(id)));
  await refreshViews();
}

export async function uploadMediaAction(formData: FormData) {
  await requireSession();
  const file = formData.get("media");

  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  await importUploadedFile(file);
  await refreshViews();
}
