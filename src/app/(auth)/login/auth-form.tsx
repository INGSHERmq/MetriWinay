"use client";

import { useActionState, useState } from "react";
import { signInAction, signUpAction, type AuthActionState } from "@/app/(auth)/actions";

const initialState: AuthActionState = {};

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [state, formAction, pending] = useActionState(
    mode === "login" ? signInAction : signUpAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 rounded-md border border-line bg-panel p-1">
        <button
          className={`h-9 rounded text-sm font-semibold ${
            mode === "login" ? "bg-white shadow-soft" : "text-muted"
          }`}
          onClick={() => setMode("login")}
          type="button"
        >
          Entrar
        </button>
        <button
          className={`h-9 rounded text-sm font-semibold ${
            mode === "register" ? "bg-white shadow-soft" : "text-muted"
          }`}
          onClick={() => setMode("register")}
          type="button"
        >
          Registro
        </button>
      </div>

      {mode === "register" ? (
        <label className="block text-sm font-medium">
          Workspace
          <input
            className="mt-2 h-11 w-full rounded-md border border-line px-3 outline-none ring-teal/20 focus:ring-4"
            name="organizationName"
            placeholder="Nombre de tu marca"
            type="text"
          />
        </label>
      ) : null}

      <label className="block text-sm font-medium">
        Email
        <input
          autoComplete="email"
          className="mt-2 h-11 w-full rounded-md border border-line px-3 outline-none ring-teal/20 focus:ring-4"
          name="email"
          placeholder="tu@email.com"
          required
          type="email"
        />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="mt-2 h-11 w-full rounded-md border border-line px-3 outline-none ring-teal/20 focus:ring-4"
          minLength={6}
          name="password"
          placeholder="********"
          required
          type="password"
        />
      </label>

      {state.error ? (
        <p className="rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral">
          {state.error}
        </p>
      ) : null}

      <button
        className="h-11 w-full rounded-md bg-ink text-sm font-semibold text-white hover:bg-[#25313f] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
      </button>
    </form>
  );
}
