"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { activarModoInvitado, desactivarModoInvitado } from "@/lib/auth-invitado";

function mensajeError(error) {
  const msg = error?.message || "Error desconocido";

  if (msg.includes("Invalid login credentials")) {
    return "Correo o contraseña incorrectos. Verifique los datos e intente de nuevo.";
  }
  if (msg.includes("Email not confirmed")) {
    return "El correo no está confirmado. Solución: en Supabase → Authentication → Users, abra el usuario y confirme el correo, o créelo de nuevo con «Auto Confirm User» activado.";
  }
  if (msg.includes("fetch failed") || msg.includes("Failed to fetch")) {
    return "No se pudo conectar con el servidor. Revise su internet o firewall.";
  }
  if (msg.includes("TIMEOUT")) {
    return "El servidor tardó demasiado en responder. Intente otra vez en unos segundos.";
  }

  return msg;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const correo = email.trim();
    if (!correo || !password) {
      setError("Complete correo y contraseña.");
      return;
    }

    setCargando(true);

    try {
      const loginPromise = supabase.auth.signInWithPassword({
        email: correo,
        password,
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT")), 20000);
      });

      const resultado = await Promise.race([loginPromise, timeoutPromise]);

      if (resultado.error) {
        setError(mensajeError(resultado.error));
        return;
      }

      if (!resultado.data?.session) {
        setError("No se obtuvo sesión. Confirme el usuario en Supabase e intente de nuevo.");
        return;
      }

      desactivarModoInvitado();
      router.push("/panel");
      router.refresh();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  const ingresarComoInvitado = async () => {
    setError("");
    setCargando(true);
    try {
      await supabase.auth.signOut();
      activarModoInvitado();
      router.push("/panel");
      router.refresh();
    } catch (err) {
      setError("No se pudo activar el modo invitado.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <Link
        href="/"
        className="mb-6 text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        ← Volver al inicio
      </Link>

      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-md"
      >
        <h2 className="mb-2 text-center text-2xl font-bold text-slate-900">
          Acceso Comisión
        </h2>
        <p className="mb-6 text-center text-sm text-slate-500">
          Ingrese sus credenciales para continuar
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
          Correo
        </label>
        <input
          className="mb-3 w-full rounded border border-slate-300 p-2 text-slate-900 disabled:bg-slate-100"
          type="email"
          placeholder="comision@cooperativa.com"
          required
          autoComplete="email"
          disabled={cargando}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
          Contraseña
        </label>
        <input
          className="mb-6 w-full rounded border border-slate-300 p-2 text-slate-900 disabled:bg-slate-100"
          type="password"
          placeholder="Su contraseña"
          required
          autoComplete="current-password"
          disabled={cargando}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={cargando}
          className="w-full rounded bg-blue-600 p-2.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cargando ? "Verificando…" : "Ingresar"}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400">o</span>
          </div>
        </div>

        <button
          type="button"
          onClick={ingresarComoInvitado}
          disabled={cargando}
          className="w-full rounded border-2 border-dashed border-slate-300 bg-slate-50 p-2.5 font-semibold text-slate-700 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Ingresar como invitado
        </button>
        <p className="mt-2 text-center text-xs text-amber-700">
          Solo para desarrollo. Sin correo ni contraseña.
        </p>

        <p className="mt-4 text-center text-xs text-slate-400">
          Usuario de prueba: <strong>comision@cooperativa.com</strong> /{" "}
          <strong>Cooperativa2026!</strong>
        </p>
      </form>
    </div>
  );
}
