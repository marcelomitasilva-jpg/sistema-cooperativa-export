import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center bg-[#edf2e6] px-4 py-10">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-emerald-800">
            Sistema Cooperativa Minera
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
            Control claro para gastos, almacen, socios y revision.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-700">
            Pensado para trabajar en oficina, campamento o reunion: botones grandes, datos visibles y
            revision antes de guardar documentos.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="big-action inline-flex items-center justify-center bg-emerald-700 px-8 py-3 text-center text-white shadow-lg transition hover:bg-emerald-800"
            >
              Ingresar al sistema
            </Link>
            <Link
              href="/panel"
              className="big-action inline-flex items-center justify-center border border-emerald-800/20 bg-white px-8 py-3 text-center font-bold text-emerald-900 transition hover:bg-emerald-50"
            >
              Ir al panel
            </Link>
          </div>
        </div>

        <div className="module-card p-6">
          <h2 className="text-xl font-black text-slate-950">Trabajo principal</h2>
          <div className="mt-5 grid gap-3">
            {[
              ["1", "Rendir gastos con foto del recibo"],
              ["2", "Revisar almacen y descargos"],
              ["3", "Controlar socios, puntas y asistencia"],
              ["4", "Cargar comision revisora con IA"],
            ].map(([numero, texto]) => (
              <div key={numero} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-lg font-black text-white">
                  {numero}
                </span>
                <p className="font-bold text-slate-800">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
