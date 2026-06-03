"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import NavPrincipal from "@/components/NavPrincipal";
import { esModoInvitado, ETIQUETA_INVITADO } from "@/lib/auth-invitado";

const modulos = [
  {
    titulo: "💰 Rendición de gastos",
    descripcion: "Registrar comprobantes y gastos de comisión.",
    href: "/rendicion",
    color: "border-sky-200 bg-sky-50 hover:bg-sky-100",
  },
  {
    titulo: "📦 Almacén",
    descripcion: "Registrar ingresos y movimientos de ítems.",
    href: "/almacen",
    color: "border-amber-200 bg-amber-50 hover:bg-amber-100",
  },
  {
    titulo: "👁️ Auditoría de almacén",
    descripcion: "Revisar movimientos registrados.",
    href: "/almacen/auditoria",
    color: "border-violet-200 bg-violet-50 hover:bg-violet-100",
  },
  {
    titulo: "📊 Plan de Cuentas",
    descripcion: "Gestionar la contabilidad y asientos.",
    href: "/contabilidad",
    color: "border-purple-200 bg-purple-50 hover:bg-purple-100",
  },
  {
    titulo: "💎 Liquidaciones de Mineral",
    descripcion: "Registrar venta de mineral por socio.",
    href: "/comercializacion",
    color: "border-yellow-200 bg-yellow-50 hover:bg-yellow-100",
  },
  {
    titulo: "📋 Control de Asistencias",
    descripcion: "Registrar asistencia a faenas y asambleas.",
    href: "/socios/asistencias",
    color: "border-cyan-200 bg-cyan-50 hover:bg-cyan-100",
  },
  {
    titulo: "⚖️ Sanciones y Multas",
    descripcion: "Gestionar sanciones disciplinarias.",
    href: "/socios/sanciones",
    color: "border-red-200 bg-red-50 hover:bg-red-100",
  },
  {
    titulo: "🔐 Panel financiero",
    descripcion: "Aprobar o rechazar rendiciones de gastos.",
    href: "/admin",
    color: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100",
  },
  {
    titulo: "👥 Gestión de socios",
    descripcion: "Alta, edición y baja de socios.",
    href: "/admin/usuarios",
    color: "border-indigo-200 bg-indigo-50 hover:bg-indigo-100",
  },
];

export default function PanelPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [esInvitado, setEsInvitado] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const invitado = esModoInvitado();
    if (invitado) {
      setEsInvitado(true);
      setEmail(ETIQUETA_INVITADO);
      setCargando(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setEmail(data.session.user.email || "");
      setCargando(false);
    });
  }, [router]);

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Cargando panel…
      </div>
    );
  }

  return (
    <>
      <NavPrincipal />
      <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Panel principal</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sesión iniciada como{" "}
              <span
                className={`font-medium ${esInvitado ? "text-amber-700" : ""}`}
              >
                {email}
              </span>
            </p>
            {esInvitado && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Modo invitado activo. Los datos de Supabase siguen disponibles
                con acceso público.
              </p>
            )}
          </div>

        <p className="mb-6 text-slate-600">
          Elija el módulo al que desea ingresar:
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {modulos.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className={`block rounded-xl border p-5 shadow-sm transition ${mod.color}`}
            >
              <h2 className="text-lg font-semibold text-slate-900">{mod.titulo}</h2>
              <p className="mt-1 text-sm text-slate-600">{mod.descripcion}</p>
              <span className="mt-3 inline-block text-sm font-semibold text-indigo-600">
                Abrir módulo →
              </span>
            </Link>
          ))}
        </div>
        </div>
      </div>
    </>
  );
}
