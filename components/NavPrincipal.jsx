"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { desactivarModoInvitado } from "@/lib/auth-invitado";

const grupos = [
  {
    titulo: "Operacion diaria",
    enlaces: [
      { href: "/panel", label: "Inicio", codigo: "IN" },
      { href: "/tesoreria", label: "Tesoreria", codigo: "TE" },
      { href: "/cuentas", label: "Cuentas", codigo: "CU" },
      { href: "/rendicion", label: "Rendir gasto", codigo: "RG" },
      { href: "/almacen", label: "Almacen", codigo: "AL" },
    ],
  },
  {
    titulo: "Mina y socios",
    enlaces: [
      { href: "/puntas", label: "Puntas", codigo: "PU" },
      { href: "/produccion", label: "Produccion", codigo: "PR" },
      { href: "/comercializacion", label: "Oro", codigo: "OR" },
      { href: "/socios/aportes", label: "Aportes", codigo: "AP" },
      { href: "/socios/asistencias", label: "Asistencia", codigo: "AS" },
      { href: "/socios/sanciones", label: "Multas", codigo: "MU" },
    ],
  },
  {
    titulo: "Revision y control",
    enlaces: [
      { href: "/comision-revisora", label: "Comision revisora", codigo: "CR" },
      { href: "/almacen/auditoria", label: "Auditar almacen", codigo: "AA" },
      { href: "/reportes", label: "Reportes", codigo: "RE" },
    ],
  },
  {
    titulo: "Administracion",
    enlaces: [
      { href: "/admin", label: "Aprobar gastos", codigo: "AG" },
      { href: "/contabilidad", label: "Contabilidad", codigo: "CO" },
      { href: "/admin/usuarios", label: "Socios sistema", codigo: "SS" },
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
  const enlaces = grupos.flatMap((grupo) => grupo.enlaces);
  const moduloActual = enlaces.find((item) => enlaceActivo(pathname, item.href));

  const cerrarSesion = async () => {
    desactivarModoInvitado();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="app-nav">
      <div className="app-nav-brand">
        <Link href="/panel" className="flex min-w-0 items-center gap-3">
          <span className="brand-mark">CM</span>
          <span className="min-w-0">
            <span className="block truncate text-base font-black text-white">Cooperativa Minera</span>
            <span className="block truncate text-xs font-black uppercase text-teal-200">
              {moduloActual?.label || "Sistema operativo"}
            </span>
          </span>
        </Link>
      </div>

      <nav className="app-nav-scroll" aria-label="Navegacion principal">
        {grupos.map((grupo) => (
          <section key={grupo.titulo} className="app-nav-group">
            <p className="app-nav-title">{grupo.titulo}</p>
            <div className="grid gap-1">
              {grupo.enlaces.map((item) => {
                const activo = enlaceActivo(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} className={`app-nav-link ${activo ? "is-active" : ""}`}>
                    <span className="app-nav-code">{item.codigo}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="app-nav-footer">
        <div className="rounded-lg border border-white/10 bg-white/8 px-3 py-2">
          <p className="text-[11px] font-black uppercase text-slate-400">Estado</p>
          <p className="text-sm font-black text-teal-100">Local + nube</p>
        </div>
        <button type="button" onClick={cerrarSesion} className="app-nav-exit">
          Salir
        </button>
      </div>
    </aside>
  );
}
