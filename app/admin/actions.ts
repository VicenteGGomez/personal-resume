"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSession,
  destroySession,
  getSession,
  verifyCredentials,
} from "@/lib/auth";
import { checkStorage, resetAnalytics } from "@/lib/analytics-store";
import { OPT_OUT_COOKIE } from "@/lib/analytics-types";
import { normalizeResumeData } from "@/lib/normalize";
import { saveCv, saveImage, saveResumeData } from "@/lib/resume-store";
import { normalizeQueue, saveTranslationQueue } from "@/lib/translation-queue";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña." };
  }
  if (!verifyCredentials(email, password)) {
    return { error: "Correo o contraseña incorrectos." };
  }

  await createSession(email);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin");
}

export interface SaveState {
  ok: boolean;
  error?: string;
  savedAt?: number;
}

export async function saveContentAction(input: unknown): Promise<SaveState> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Sesión expirada. Vuelve a iniciar sesión." };
  }
  try {
    const data = normalizeResumeData(input);
    await saveResumeData(data);
    return { ok: true, savedAt: Date.now() };
  } catch (error) {
    console.error("saveContentAction failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `No se pudo guardar: ${message}` };
  }
}

/**
 * Persist the "translate later" list behind the bell in /admin. It is a to-do
 * list rather than content, so it is saved on its own — deferring a translation
 * must not rewrite the résumé, and clearing one entry must not wait for a
 * content save.
 */
export async function saveTranslationQueueAction(
  input: unknown,
): Promise<SaveState> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Sesión expirada. Vuelve a iniciar sesión." };
  }
  try {
    await saveTranslationQueue(normalizeQueue(input));
    return { ok: true, savedAt: Date.now() };
  } catch (error) {
    console.error("saveTranslationQueueAction failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `No se pudo guardar la lista: ${message}` };
  }
}

export interface UploadState {
  url?: string;
  error?: string;
}

export async function uploadImageAction(formData: FormData): Promise<UploadState> {
  const session = await getSession();
  if (!session) {
    return { error: "Sesión expirada. Vuelve a iniciar sesión." };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona una imagen." };
  }
  try {
    const url = await saveImage(file);
    return { url };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo subir la imagen.";
    return { error: message };
  }
}

/** Round-trip the metrics storage and report what happened. */
export async function checkStorageAction(): Promise<{
  ok: boolean;
  detail: string;
}> {
  const session = await getSession();
  if (!session) {
    return { ok: false, detail: "Sesión expirada. Vuelve a iniciar sesión." };
  }
  const result = await checkStorage();
  return { ok: result.ok, detail: result.detail };
}

/** Wipe every stored visit metric. Irreversible, so the UI asks first. */
export async function resetStatsAction(): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Sesión expirada. Vuelve a iniciar sesión." };
  }
  try {
    await resetAnalytics();
    return { ok: true };
  } catch (error) {
    console.error("resetStatsAction failed:", error);
    return { ok: false, error: "No se pudieron borrar las métricas." };
  }
}

/** A year: long enough to forget about it, short enough to expire on its own. */
const OPT_OUT_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Stop counting visits from *this* browser, or start counting them again.
 *
 * The admin session already hides your visits, but only for the seven days it
 * lasts and only in the browser you signed in with. This cookie is separate and
 * long-lived, and the server checks it on every hit — page views, clicks and CV
 * downloads alike — so run it once per device (phone included) and you are out
 * of your own metrics for a year.
 */
export async function setOptOutAction(
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Sesión expirada. Vuelve a iniciar sesión." };
  }
  const store = await cookies();
  if (enabled) {
    store.set(OPT_OUT_COOKIE, "1", {
      maxAge: OPT_OUT_MAX_AGE,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    store.delete(OPT_OUT_COOKIE);
  }
  return { ok: true };
}

export async function uploadCvAction(formData: FormData): Promise<UploadState> {
  const session = await getSession();
  if (!session) {
    return { error: "Sesión expirada. Vuelve a iniciar sesión." };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un PDF." };
  }
  const previousUrl = String(formData.get("previousUrl") ?? "");
  try {
    const url = await saveCv(file, previousUrl);
    return { url };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo subir el PDF.";
    return { error: message };
  }
}
