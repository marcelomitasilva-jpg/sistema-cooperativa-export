"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import NavPrincipal from "@/components/NavPrincipal";
import { esModoInvitado, ETIQUETA_INVITADO } from "@/lib/auth-invitado";

const trabajosPrincipales = [
  {
    titulo: "Caja del dia",
    descripcion: "Ingresos, gastos, venta de oro, prestamos, pagos parciales y DELAPAZ.",
    href: "/tesoreria",
    accion: "Abrir tesoreria",
    tono: "bg-slate-950 text-white",
    codigo: "TE",
  },
  {
    titulo: "Cuentas pendientes",
    descripcion: "Buscar de inmediato quien debe, a quien se debe y que saldo queda.",
    href: "/cuentas",
    accion: "Buscar saldos",
    tono: "bg-amber-700 text-white",
    codigo: "CU",
  },
  {
    titulo: "Comision revisora",
    descripcion: "Cargar libros, recibos y respaldos para encontrar descuadres.",
    href: "/comision-revisora",
    accion: "Revisar gestion",
    tono: "bg-teal-700 text-white",
    codigo: "CR",
  },
  {
    titulo: "Almacen",
    descripcion: "Ingreso fisico, sello, salida de insumos y stock por item.",
    href: "/almacen",
    accion: "Controlar almacen",
    tono: "bg-blue-700 text-white",
    codigo: "AL",
  },
];

const resumenTrabajo = [
  ["Caja y bancos", "Tesoreria"],
  ["Saldos por cobrar", "Cuentas"],
  ["Recibos observados", "Revision"],
  ["Stock critico", "Almacen"],
];

const accesos = [
  ["Puntas", "/puntas"],
  ["Produccion", "/produccion"],
  ["Oro y liquidacion", "/comercializacion"],
  ["Rendir gasto", "/rendicion"],
  ["Aportes", "/socios/aportes"],
  ["Asistencia", "/socios/asistencias"],
  ["Multas", "/socios/sanciones"],
  ["Aprobar gastos", "/admin"],
  ["Contabilidad", "/contabilidad"],
  ["Socios sistema", "/admin/usuarios"],
  ["Auditar almacen", "/almacen/auditoria"],
  ["Reportes", "/reportes"],
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
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-lg font-black text-slate-700">
        Cargando sistema...
      </div>
    );
  }

  return (
    <div className="app-shell">
      <NavPrincipal />
      <main>
        <div className="page-wrap space-y-6">
          <section className="page-hero p-5 md:p-7">
            <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
              <div>
                <p className="text-sm font-black uppercase text-teal-200">Panel principal</p>
                <h1 className="mt-2 max-w-3xl text-4xl font-black leading-tight">
                  Elija el trabajo y vea lo urgente primero.
                </h1>
                <p className="mt-3 max-w-3xl text-base font-semibold leading-relaxed text-slate-200">
                  Pantalla pensada para oficina, mina o asamblea: caja, deudas, respaldos y revision sin perderse en menus.
                </p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-4">
                <p className="text-xs font-black uppercase text-slate-300">Sesion actual</p>
                <p className="mt-1 break-all text-lg font-black text-white">{email}</p>
                {esInvitado ? (
                  <p className="mt-3 rounded-lg bg-amber-300 px-3 py-2 text-sm font-black text-slate-950">
                    Modo invitado: solo para pruebas.
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {resumenTrabajo.map(([titulo, modulo]) => (
              <div key={titulo} className="metric-card p-4">
                <p className="text-xs font-black uppercase text-slate-500">{titulo}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">Ver en {modulo}</p>
                <p className="mt-1 text-sm font-bold text-slate-500">Resumen operativo conectado al modulo.</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-4">
            {trabajosPrincipales.map((modulo) => (
              <Link key={modulo.href} href={modulo.href} className="module-card group p-5 transition hover:-translate-y-0.5 hover:shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-sm font-black text-slate-700">
                    {modulo.codigo}
                  </span>
                  <span className="status-pill bg-slate-100 text-slate-600">Diario</span>
                </div>
                <h2 className="mt-5 text-2xl font-black text-slate-950">{modulo.titulo}</h2>
                <p className="mt-2 min-h-20 text-sm font-semibold leading-relaxed text-slate-600">
                  {modulo.descripcion}
                </p>
                <span className={`mt-4 inline-flex w-full justify-center rounded-lg px-4 py-3 text-sm font-black transition group-hover:brightness-110 ${modulo.tono}`}>
                  {modulo.accion}
                </span>
              </Link>
            ))}
          </section>

          <section className="work-panel p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="eyebrow">Accesos rapidos</p>
                <h2 className="section-title mt-1">Otros modulos de trabajo</h2>
              </div>
              <p className="help-text">Use estos accesos cuando ya sabe que tarea va a realizar.</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {accesos.map(([titulo, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-black text-slate-800 transition hover:border-teal-300 hover:bg-white hover:text-teal-800 hover:shadow-sm"
                >
                  {titulo}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
