import Link from "next/link";

const bloques = [
  ["Caja", "Ingresos, egresos, prestamos y pagos parciales."],
  ["Revision", "Folios, recibos, libros fisicos y anomalias."],
  ["Mina", "Puntas, produccion, almacen y venta de oro."],
];

export default function Home() {
  return (
    <main className="flex min-h-screen items-center px-4 py-10">
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="page-hero p-6 md:p-8">
          <p className="text-sm font-black uppercase text-teal-200">Sistema Cooperativa Minera</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
            Control operativo simple para una cooperativa aurifera.
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-slate-200">
            Tesoreria, almacen, socios, comision revisora, respaldos con imagen y contabilidad generada por detras.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="big-action inline-flex items-center justify-center bg-white px-8 py-3 text-center text-slate-950 shadow-lg transition hover:bg-slate-100"
            >
              Ingresar al sistema
            </Link>
            <Link
              href="/panel"
              className="big-action inline-flex items-center justify-center border border-white/25 bg-white/10 px-8 py-3 text-center font-black text-white transition hover:bg-white/15"
            >
              Ir al panel
            </Link>
          </div>
        </div>

        <div className="work-panel p-5">
          <p className="eyebrow">Mesa de trabajo</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Lo importante al frente</h2>
          <div className="mt-5 grid gap-3">
            {bloques.map(([titulo, texto], index) => (
              <div key={titulo} className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block font-black text-slate-950">{titulo}</span>
                  <span className="block text-sm font-semibold text-slate-600">{texto}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
