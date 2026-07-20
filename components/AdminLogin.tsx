"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";

const initialState: LoginState = {};

export default function AdminLogin() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-5 text-[#1d1d1f] dark:bg-[#050505] dark:text-white">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Panel de administración</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Ingresa para editar tu currículum.
          </p>
        </div>

        <form
          action={formAction}
          className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10"
        >
          <label className="block text-sm font-medium" htmlFor="email">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:bg-black/30 dark:focus:border-white/30"
            placeholder="tu@correo.cl"
          />

          <label className="mt-5 block text-sm font-medium" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:bg-black/30 dark:focus:border-white/30"
            placeholder="••••••••"
          />

          {state.error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-60 dark:bg-white dark:text-black"
          >
            {pending ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Acceso restringido.
        </p>
      </div>
    </main>
  );
}
