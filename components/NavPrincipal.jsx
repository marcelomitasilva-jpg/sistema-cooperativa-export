"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { desactivarModoInvitado } from "@/lib/auth-invitado";

const grupos = [
  {
    titulo: "Trabajo diario",
    enlaces: [
      { href: "/panel", label: "Inicio" },
      { href: "/tesoreria", label: "Tesoreria" },
      { href: "/rendicion", label: "Rendir gasto" },
      { href: "/almacen", label: "Almacen" },
      { href: "/puntas", label: "Puntas" },
      { href: "/produccion", label: "Produccion" },
      { href: "/comercializacion", label: "Oro y liquidacion" },
    ],
  },
  {
    titulo: "Socios",
    enlaces: [
      { href: "/socios/aportes", label: "Aportes" },
      { href: "/socios/asistencias", label: "Asistencia" },
      { href: "/socios/sanciones", label: "Multas" },
    ],
  },
  {
    titulo: "Revision",
    enlaces: [
      { href: "/comision-revisora", label: "Comision revisora" },
      { href: "/almacen/auditoria", label: "Revisar almacen" },
      { href: "/reportes", label: "Reportes" },
    ],
  },
  {
    titulo: "Administracion",
    enlaces: [
      { href: "/admin", label: "Aprobar gastos" },
      { href: "/contabilidad", label: "Contabilidad" },
      { href: "/admin/usuarios", label: "Socios sistema" },
    ],
  },
];

function enlaceActivo(pathname, href) {
  if (href === "/panel") return pathname === "/panel";
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavPrincipal() {
  const pathname = usePathname();
  const router = useRouter();

  const cerrarSesion = async () => {
    desactivarModoInvitado();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const enlaces = grupos.flatMap((grupo) => grupo.enlaces);
  const moduloActual = enlaces.find((item) => enlaceActivo(pathname, item.href));

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-900/10 bg-[#f8faf4]/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/panel" className="min-w-0">
            <p className="text-lg font-black leading-tight text-emerald-950">Cooperativa Minera</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {moduloActual?.label || "Sistema de trabajo"}
            </p>
          </Link>

          <button
            type="button"
            onClick={cerrarSesion}
            className="shrink-0 rounded-lg border border-emerald-900/15 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-emerald-50"
          >
            Salir
          </button>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Navegacion principal">
          {grupos.map((grupo) => (
            <div key={grupo.titulo} className="flex shrink-0 items-center gap-1 rounded-lg bg-white/80 p-1">
              <span className="hidden px-2 text-xs font-bold uppercase tracking-wide text-slate-500 md:inline">
                {grupo.titulo}
              </span>
              {grupo.enlaces.map((item) => {
                const activo = enlaceActivo(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition ${
                      activo
                        ? "bg-emerald-700 text-white shadow-sm"
                        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
}
