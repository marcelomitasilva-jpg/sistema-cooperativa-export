"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import NavPrincipal from "@/components/NavPrincipal";
import { esModoInvitado, ETIQUETA_INVITADO } from "@/lib/auth-invitado";

const modulosPrincipales = [
  {
    titulo: "Rendir gasto",
    descripcion: "Subir recibo, leer con IA y mandar para aprobacion.",
    href: "/rendicion",
    accion: "Cargar recibo",
    tono: "bg-emerald-700 text-white",
  },
  {
    titulo: "Comision revisora",
    descripcion: "Cargar libros, recibos y buscar descuadres de gestiones pasadas.",
    href: "/comision-revisora",
    accion: "Revisar documentos",
    tono: "bg-amber-700 text-white",
  },
  {
    titulo: "Almacen",
    descripcion: "Registrar ingreso fisico, sello, cantidad y responsable.",
    href: "/almacen",
    accion: "Registrar ingreso",
    tono: "bg-sky-700 text-white",
  },
  {
    titulo: "Reportes",
    descripcion: "Ver resumen de gastos, almacen, socios y pendientes.",
    href: "/reportes",
    accion: "Ver informe",
    tono: "bg-slate-800 text-white",
  },
];

const accesosRapidos = [
  { titulo: "Puntas", href: "/puntas" },
  { titulo: "Produccion", href: "/produccion" },
  { titulo: "Oro y liquidacion", href: "/comercializacion" },
  { titulo: "Aportes", href: "/socios/aportes" },
  { titulo: "Asistencia", href: "/socios/asistencias" },
  { titulo: "Multas", href: "/socios/sanciones" },
  { titulo: "Aprobar gastos", href: "/admin" },
  { titulo: "Contabilidad", href: "/contabilidad" },
  { titulo: "Socios sistema", href: "/admin/usuarios" },
  { titulo: "Revisar almacen", href: "/almacen/auditoria" },
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
      <div className="flex min-h-screen items-center justify-center bg-[#edf2e6] text-lg font-bold text-slate-600">
        Cargando el sistema...
      </div>
    );
  }

  return (
    <div className="app-shell">
      <NavPrincipal />
      <main>
        <div className="page-wrap">
          <section className="mb-6 flex flex-col gap-4 rounded-lg border border-emerald-900/10 bg-white p-5 shadow-sm md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-emerald-800">
                Panel principal
              </p>
              <h1 className="mt-1 text-3xl font-black text-slate-950">
                Que trabajo va a realizar?
              </h1>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                Sesion: <span className={esInvitado ? "text-amber-700" : "text-emerald-800"}>{email}</span>
              </p>
            </div>
            {esInvitado ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                Modo invitado activo. Sirve para pruebas.
              </p>
            ) : null}
          </section>

          <section className="grid gap-4 lg:grid-cols-4">
            {modulosPrincipales.map((modulo) => (
              <Link key={modulo.href} href={modulo.href} className="module-card p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <h2 className="text-xl font-black text-slate-950">{modulo.titulo}</h2>
                <p className="mt-2 min-h-16 text-sm font-semibold leading-relaxed text-slate-600">
                  {modulo.descripcion}
                </p>
                <span className={`mt-4 inline-flex w-full justify-center rounded-lg px-4 py-3 text-sm font-black ${modulo.tono}`}>
                  {modulo.accion}
                </span>
              </Link>
            ))}
          </section>

          <section className="mt-6 module-card p-5">
            <h2 className="text-lg font-black text-slate-950">Otros trabajos</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {accesosRapidos.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-black text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50"
                >
                  {item.titulo}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
