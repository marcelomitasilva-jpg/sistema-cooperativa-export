"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { activarModoInvitado, desactivarModoInvitado } from "@/lib/auth-invitado";

function mensajeError(error) {
  const msg = error?.message || "Error desconocido";

  if (msg.includes("Invalid login credentials")) {
    return "Correo o contrasena incorrectos. Verifique los datos e intente de nuevo.";
  }
  if (msg.includes("Email not confirmed")) {
    return "El correo no esta confirmado. Avise al encargado del sistema para habilitar el usuario.";
  }
  if (msg.includes("fetch failed") || msg.includes("Failed to fetch")) {
    return "No se pudo conectar con el servidor. Revise su internet o firewall.";
  }
  if (msg.includes("TIMEOUT")) {
    return "El servidor tardo demasiado en responder. Intente otra vez en unos segundos.";
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
      setError("Complete correo y contrasena.");
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
        setError("No se obtuvo sesion. Avise al encargado del sistema.");
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
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="grid w-full max-w-5xl gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <div className="page-hero flex flex-col justify-between p-6 md:p-8">
          <div>
            <Link href="/" className="text-sm font-black text-teal-200 hover:text-white">
              Volver al inicio
            </Link>
            <p className="mt-10 text-sm font-black uppercase text-teal-200">Acceso seguro</p>
            <h1 className="mt-2 text-4xl font-black leading-tight">Entrar al sistema cooperativo</h1>
            <p className="mt-4 text-base font-semibold leading-relaxed text-slate-200">
              Use su cuenta asignada. Si solo esta probando, puede entrar como invitado de desarrollo.
            </p>
          </div>
          <div className="mt-8 rounded-lg border border-white/15 bg-white/10 p-4">
            <p className="text-sm font-black text-white">Trabajo protegido</p>
            <p className="mt-1 text-sm font-semibold text-slate-200">
              Los respaldos, deudas y movimientos deben quedar con usuario y fecha para auditoria.
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="module-card w-full p-6 md:p-8">
          <p className="eyebrow text-center">Identificacion</p>
          <h2 className="mt-1 text-center text-3xl font-black text-slate-950">Ingrese sus datos</h2>
          <p className="mt-2 text-center text-sm font-semibold text-slate-600">
            Correo y contrasena de la cooperativa.
          </p>

        {error ? (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          <label className="field-label">Correo</label>
          <input
            className="w-full border px-3 py-2 text-slate-900 disabled:bg-slate-100"
            type="email"
            placeholder="comision@cooperativa.com"
            required
            autoComplete="email"
            disabled={cargando}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <label className="field-label">Contrasena</label>
          <input
            className="w-full border px-3 py-2 text-slate-900 disabled:bg-slate-100"
            type="password"
            placeholder="Su contrasena"
            required
            autoComplete="current-password"
            disabled={cargando}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={cargando}
          className="big-action mt-6 w-full bg-emerald-700 p-3 font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cargando ? "Verificando..." : "Ingresar"}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 font-bold text-slate-400">o</span>
          </div>
        </div>

        <button
          type="button"
          onClick={ingresarComoInvitado}
          disabled={cargando}
          className="big-action w-full border-2 border-dashed border-slate-300 bg-slate-50 p-3 font-black text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Ingresar como invitado
        </button>
        <p className="mt-3 text-center text-xs font-semibold text-amber-700">
          Solo para pruebas. Sin correo ni contrasena.
        </p>
        </form>
      </section>
    </main>
  );
}
