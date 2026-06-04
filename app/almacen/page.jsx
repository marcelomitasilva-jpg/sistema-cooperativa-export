"use client";

import { useEffect, useState } from "react";
import NavPrincipal from "@/components/NavPrincipal";
import { supabase } from "@/lib/supabase-client";

const FORM_INICIAL = {
  fecha_movimiento: new Date().toISOString().slice(0, 10),
  item_nombre: "",
  cantidad: "",
  unidad: "",
  tipo_movimiento: "Ingreso",
  rubro: "Materiales y repuestos",
  subrubro: "",
  distribuidor_id: "",
  proveedor_nombre: "",
  comprado_por: "",
  recibido_por: "",
  numero_recibo: "",
  folio: "",
  destino_uso: "",
  estado_verificacion: "verificado_fisicamente",
  sello_recibo: true,
  observaciones: "",
};

const RUBROS_ALMACEN = [
  "Materiales y repuestos",
  "Combustible",
  "Aceites y grasas",
  "Explosivos",
  "Herramientas",
  "Madera",
  "Electrodos",
  "Maquinaria y equipos",
  "Compra directa consumida",
  "Otro",
];

function normalizarMovimiento(tipo) {
  return String(tipo || "Ingreso").toLowerCase();
}

export default function AlmacenForm() {
  const [socios, setSocios] = useState([]);
  const [distribuidores, setDistribuidores] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [formData, setFormData] = useState(FORM_INICIAL);

  useEffect(() => {
    async function fetchData() {
      const [{ data: s }, { data: d }] = await Promise.all([
        supabase.from("personal_socios").select("id, nombre").order("nombre", { ascending: true }),
        supabase.from("distribuidores").select("id, nombre").order("nombre", { ascending: true }),
      ]);
      setSocios(s || []);
      setDistribuidores(d || []);
    }
    fetchData();
  }, []);

  const actualizarCampo = (campo, valor) => {
    setFormData((actual) => ({ ...actual, [campo]: valor }));
    if (errors[campo]) setErrors((actual) => ({ ...actual, [campo]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    const tipo = normalizarMovimiento(formData.tipo_movimiento);

    if (!formData.item_nombre.trim()) newErrors.item_nombre = "El item es requerido.";
    if (!formData.cantidad || Number(formData.cantidad) <= 0) {
      newErrors.cantidad = "La cantidad debe ser mayor a 0.";
    }
    if (tipo === "ingreso" && !formData.proveedor_nombre.trim() && !formData.distribuidor_id) {
      newErrors.proveedor_nombre = "Registra proveedor o distribuidor.";
    }
    if (tipo === "ingreso" && !formData.comprado_por.trim()) {
      newErrors.comprado_por = "Indica quien compro o trajo el descargo.";
    }
    if (tipo === "ingreso" && !formData.recibido_por.trim()) {
      newErrors.recibido_por = "Indica el almacenero o responsable que verifico.";
    }
    if (tipo === "ingreso" && !formData.folio.trim()) {
      newErrors.folio = "El folio ayuda a conectar con el recibo fisico.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const insertarConFallback = async (payload) => {
    const { error } = await supabase.from("almacen_movimientos_auditado").insert([payload]);
    if (!error) return;

    const mensajeError = `${error.message || ""} ${error.details || ""}`;
    if (!/schema cache|column|Could not find/i.test(mensajeError)) throw error;

    const base = {
      item_nombre: payload.item_nombre,
      cantidad: payload.cantidad,
      tipo_movimiento: payload.tipo_movimiento,
      distribuidor_id: payload.distribuidor_id,
      recibido_por: payload.recibido_por,
    };
    const retry = await supabase.from("almacen_movimientos_auditado").insert([base]);
    if (retry.error) throw retry.error;

    setMensaje({
      tipo: "advertencia",
      texto:
        "Movimiento guardado con campos basicos. Ejecuta docs/supabase-mejoras-operativas.sql para guardar folio, recibo, sello y verificacion.",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setMensaje({ texto: "", tipo: "" });

    const comprador = formData.comprado_por.trim();
    const almacenero = formData.recibido_por.trim();
    const payload = {
      ...formData,
      cantidad: Number(formData.cantidad),
      distribuidor_id: formData.distribuidor_id ? Number(formData.distribuidor_id) : null,
      proveedor_nombre:
        formData.proveedor_nombre.trim() ||
        distribuidores.find((d) => String(d.id) === String(formData.distribuidor_id))?.nombre ||
        null,
      comprado_por: comprador || null,
      recibido_por: almacenero ? [almacenero] : [],
      numero_recibo: formData.numero_recibo.trim() || null,
      folio: formData.folio.trim() || null,
      sello_recibo: Boolean(formData.sello_recibo),
      observaciones:
        formData.observaciones.trim() ||
        `Compra/descargo verificado fisicamente por almacen. Sello recibo: ${
          formData.sello_recibo ? "si" : "no"
        }.`,
    };

    try {
      await insertarConFallback(payload);
      setMensaje((actual) =>
        actual.texto
          ? actual
          : { tipo: "exito", texto: "Movimiento de almacen registrado con verificacion fisica." }
      );
      setFormData(FORM_INICIAL);
      setErrors({});
    } catch (error) {
      setMensaje({ tipo: "error", texto: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const claseMensaje =
    mensaje.tipo === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : mensaje.tipo === "advertencia"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <>
      <NavPrincipal />
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <section>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
              Almacen
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Ingreso fisico con descargo y sello
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Registra la compra del insumo, el descargo presentado, la verificacion fisica del
              almacenero y el sello del recibo fisico.
            </p>
          </section>

          {mensaje.texto ? (
            <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${claseMensaje}`}>
              {mensaje.texto}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Fecha</label>
                <input
                  type="date"
                  value={formData.fecha_movimiento}
                  onChange={(e) => actualizarCampo("fecha_movimiento", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Tipo</label>
                <select
                  value={formData.tipo_movimiento}
                  onChange={(e) => actualizarCampo("tipo_movimiento", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  <option>Ingreso</option>
                  <option>Egreso</option>
                  <option>Traspaso</option>
                  <option>Compra directa consumida</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Estado</label>
                <select
                  value={formData.estado_verificacion}
                  onChange={(e) => actualizarCampo("estado_verificacion", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  <option value="verificado_fisicamente">Verificado fisicamente</option>
                  <option value="pendiente_verificacion">Pendiente verificacion</option>
                  <option value="observado">Observado</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700">Item / insumo</label>
                <input
                  value={formData.item_nombre}
                  onChange={(e) => actualizarCampo("item_nombre", e.target.value)}
                  className={`mt-1 w-full rounded-md border px-3 py-2 ${
                    errors.item_nombre ? "border-red-400 bg-red-50" : "border-slate-300"
                  }`}
                  placeholder="Ej. rodamiento, electrodo, diesel, guia, grasa"
                />
                {errors.item_nombre ? <p className="mt-1 text-xs text-red-600">{errors.item_nombre}</p> : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Cantidad</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.cantidad}
                    onChange={(e) => actualizarCampo("cantidad", e.target.value)}
                    className={`mt-1 w-full rounded-md border px-3 py-2 ${
                      errors.cantidad ? "border-red-400 bg-red-50" : "border-slate-300"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Unidad</label>
                  <input
                    value={formData.unidad}
                    onChange={(e) => actualizarCampo("unidad", e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                    placeholder="pza, kg, lt"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Rubro</label>
                <select
                  value={formData.rubro}
                  onChange={(e) => actualizarCampo("rubro", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  {RUBROS_ALMACEN.map((rubro) => (
                    <option key={rubro}>{rubro}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Subrubro</label>
                <input
                  value={formData.subrubro}
                  onChange={(e) => actualizarCampo("subrubro", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="Repuesto, aceite, guia, fulminante"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Destino / uso</label>
                <input
                  value={formData.destino_uso}
                  onChange={(e) => actualizarCampo("destino_uso", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="Mina, tujo, rio, maquinaria"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Distribuidor registrado</label>
                <select
                  value={formData.distribuidor_id}
                  onChange={(e) => actualizarCampo("distribuidor_id", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  <option value="">Sin distribuidor registrado</option>
                  {distribuidores.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Proveedor del recibo</label>
                <input
                  value={formData.proveedor_nombre}
                  onChange={(e) => actualizarCampo("proveedor_nombre", e.target.value)}
                  className={`mt-1 w-full rounded-md border px-3 py-2 ${
                    errors.proveedor_nombre ? "border-red-400 bg-red-50" : "border-slate-300"
                  }`}
                  placeholder="Proveedor o tienda"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Compro / trajo descargo</label>
                <input
                  value={formData.comprado_por}
                  onChange={(e) => actualizarCampo("comprado_por", e.target.value)}
                  className={`mt-1 w-full rounded-md border px-3 py-2 ${
                    errors.comprado_por ? "border-red-400 bg-red-50" : "border-slate-300"
                  }`}
                  placeholder="Socio o responsable"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Almacenero / verificado por</label>
                <input
                  list="socios-lista"
                  value={formData.recibido_por}
                  onChange={(e) => actualizarCampo("recibido_por", e.target.value)}
                  className={`mt-1 w-full rounded-md border px-3 py-2 ${
                    errors.recibido_por ? "border-red-400 bg-red-50" : "border-slate-300"
                  }`}
                  placeholder="Quien verifico fisicamente"
                />
                <datalist id="socios-lista">
                  {socios.map((socio) => (
                    <option key={socio.id} value={socio.nombre} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Nro recibo</label>
                <input
                  value={formData.numero_recibo}
                  onChange={(e) => actualizarCampo("numero_recibo", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="Puede quedar vacio si el recibo no tiene"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Folio</label>
                <input
                  value={formData.folio}
                  onChange={(e) => actualizarCampo("folio", e.target.value)}
                  className={`mt-1 w-full rounded-md border px-3 py-2 ${
                    errors.folio ? "border-red-400 bg-red-50" : "border-slate-300"
                  }`}
                  placeholder="Folio del descargo"
                />
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 md:col-span-3">
                <input
                  type="checkbox"
                  checked={formData.sello_recibo}
                  onChange={(e) => actualizarCampo("sello_recibo", e.target.checked)}
                  className="h-4 w-4"
                />
                Recibo fisico sellado por almacen despues de verificar el ingreso
              </label>

              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-slate-700">Observaciones</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => actualizarCampo("observaciones", e.target.value)}
                  className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="Estado fisico, diferencias, faltantes, sello, vinculacion con rendicion..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-blue-700 px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
            >
              {loading ? "Guardando..." : "Registrar ingreso/verificacion"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
