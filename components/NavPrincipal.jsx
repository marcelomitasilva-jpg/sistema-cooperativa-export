"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { desactivarModoInvitado } from "@/lib/auth-invitado";

const grupos = [
  {
    titulo: "Operacion",
    codigo: "OP",
    enlaces: [
      { href: "/panel", label: "Inicio", corto: "IN" },
      { href: "/tesoreria", label: "Tesoreria", corto: "TE" },
      { href: "/cuentas", label: "Cuentas", corto: "CU" },
      { href: "/rendicion", label: "Rendir gasto", corto: "RG" },
      { href: "/almacen", label: "Almacen", corto: "AL" },
    ],
  },
  {
    titulo: "Mina y socios",
    codigo: "MS",
    enlaces: [
      { href: "/puntas", label: "Puntas", corto: "PU" },
      { href: "/produccion", label: "Produccion", corto: "PR" },
      { href: "/comercializacion", label: "Oro", corto: "OR" },
      { href: "/socios/aportes", label: "Aportes", corto: "AP" },
      { href: "/socios/asistencias", label: "Asistencia", corto: "AS" },
      { href: "/socios/sanciones", label: "Multas", corto: "MU" },
    ],
  },
  {
    titulo: "Revision",
    codigo: "RV",
    enlaces: [
      { href: "/comision-revisora", label: "Comision revisora", corto: "CR" },
      { href: "/almacen/auditoria", label: "Auditar almacen", corto: "AA" },
      { href: "/reportes", label: "Reportes", corto: "RE" },
    ],
  },
  {
    titulo: "Administracion",
    codigo: "AD",
    enlaces: [
      { href: "/admin", label: "Aprobar gastos", corto: "AG" },
      { href: "/contabilidad", label: "Contabilidad", corto: "CO" },
      { href: "/admin/usuarios", label: "Socios sistema", corto: "SS" },
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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/92 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-3 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/panel" className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white shadow-sm">
              CM
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lg font-black leading-tight text-slate-950">Cooperativa Minera</span>
              <span className="block truncate text-xs font-black uppercase text-teal-700">
                {moduloActual?.label || "Sistema operativo"}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-600 sm:inline-flex">
              Local + nube
            </span>
            <button
              type="button"
              onClick={cerrarSesion}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Salir
            </button>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Navegacion principal">
          {grupos.map((grupo) => (
            <section key={grupo.titulo} className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-[11px] font-black text-slate-500 shadow-sm">
                {grupo.codigo}
              </span>
              {grupo.enlaces.map((item) => {
                const activo = enlaceActivo(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`flex h-9 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-black transition ${
                      activo
                        ? "bg-slate-950 text-white shadow-sm"
                        : "text-slate-700 hover:bg-white hover:text-teal-800 hover:shadow-sm"
                    }`}
                  >
                    <span className={`hidden rounded px-1.5 py-0.5 text-[10px] font-black sm:inline ${
                      activo ? "bg-white/15 text-white" : "bg-slate-200 text-slate-600"
                    }`}>
                      {item.corto}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>
      </div>
    </header>
  );
}
