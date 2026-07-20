"use server";

import { redirect } from "next/navigation";
import {
  createSession,
  destroySession,
  getSession,
  verifyCredentials,
} from "@/lib/auth";
import { normalizeResumeData } from "@/lib/normalize";
import { saveImage, saveResumeData } from "@/lib/resume-store";

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
    return { ok: false, error: "No se pudo guardar. Inténtalo de nuevo." };
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
