"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { desactivarModoInvitado } from "@/lib/auth-invitado";

const enlaces = [
  { href: "/panel", label: "Inicio" },
  { href: "/rendicion", label: "Rendiciones" },
  { href: "/puntas", label: "Puntas" },
  { href: "/produccion", label: "Produccion" },
  { href: "/almacen", label: "Almacen" },
  { href: "/contabilidad", label: "Contabilidad" },
  { href: "/comercializacion", label: "Liquidaciones" },
  { href: "/comision-revisora", label: "Comision Revisora" },
  { href: "/socios/aportes", label: "Aportes" },
  { href: "/socios/asistencias", label: "Asistencias" },
  { href: "/socios/sanciones", label: "Sanciones" },
  { href: "/reportes", label: "Reportes" },
  { href: "/admin", label: "Finanzas" },
];

function enlaceActivo(pathname, href) {
  if (href === "/panel") return pathname === "/panel";
  if (href === "/admin") return pathname === "/admin";
  if (href === "/socios/asistencias") return pathname.startsWith("/socios/asistencias");
  if (href === "/socios/sanciones") return pathname.startsWith("/socios/sanciones");
  if (href === "/socios/aportes") return pathname.startsWith("/socios/aportes");
  if (href === "/almacen") return pathname.startsWith("/almacen");
  if (href === "/reportes") return pathname.startsWith("/reportes");
  if (href === "/puntas") return pathname.startsWith("/puntas");
  if (href === "/produccion") return pathname.startsWith("/produccion");
  if (href === "/comision-revisora") return pathname.startsWith("/comision-revisora");
  return pathname === href;
}

export default function NavPrincipal() {
  const pathname = usePathname();
  const router = useRouter();

  const cerrarSesion = async () => {
    desactivarModoInvitado();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link
          href="/panel"
          className="text-lg font-bold tracking-tight text-indigo-900 hover:text-indigo-700"
        >
          Sistema Cooperativa
        </Link>

        <nav className="flex gap-1 overflow-x-auto pb-1 sm:pb-0" aria-label="Navegacion principal">
          {enlaces.map((item) => {
            const activo = enlaceActivo(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  activo
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={cerrarSesion}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Salir
        </button>
      </div>
    </header>
  );
}
