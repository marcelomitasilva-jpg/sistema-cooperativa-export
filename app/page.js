import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 shadow-2xl backdrop-blur-sm sm:p-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-300">
            Sistema Cooperativa
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Bienvenido
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
            Plataforma integral para la gestión de rendiciones, almacén,
            auditoría financiera y socios de la cooperativa.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "Rendición de gastos con soporte documental",
              "Control y auditoría de almacén",
              "Aprobación de comisiones",
              "Administración de socios",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
              >
                <span className="mt-0.5 text-indigo-400" aria-hidden>
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-8 py-3 text-center text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Ingresar al sistema
            </Link>
            <p className="text-sm text-slate-400">
              Acceso exclusivo para personal autorizado de la comisión.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Cooperativa — Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
