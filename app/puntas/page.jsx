"use client";

import { useEffect, useMemo, useState } from "react";
import NavPrincipal from "@/components/NavPrincipal";
import { supabase } from "@/lib/supabase-client";

const PUNTA_INICIAL = { nombre: "", estado: "Activa", observaciones: "" };

export default function PuntasPage() {
  const [puntas, setPuntas] = useState([]);
  const [asociados, setAsociados] = useState([]);
  const [socios, setSocios] = useState([]);
  const [lugares, setLugares] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [directorio, setDirectorio] = useState([]);
  const [coordinadores, setCoordinadores] = useState([]);
  const [puntaForm, setPuntaForm] = useState(PUNTA_INICIAL);
  const [asignacion, setAsignacion] = useState({ punta_id: "", socio_id: "", rol: "Asociado" });
  const [autoridad, setAutoridad] = useState({ punta_id: "", delegado_socio_id: "", jefe_punta_socio_id: "" });
  const [dirForm, setDirForm] = useState({ socio_id: "", cargo: "Presidente", estado: "Activo" });
  const [coordForm, setCoordForm] = useState({ lugar_trabajo_id: "", socio_id: "", turno_id: "", estado: "Activo" });
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const cargarDatos = async () => {
    setCargando(true);
    setMensaje("");

    const [puntasRes, asociadosRes, sociosRes, lugaresRes, turnosRes, directorioRes, coordRes] =
      await Promise.all([
        supabase
          .from("puntas")
          .select("*, delegado:personal_socios!puntas_delegado_socio_id_fkey(nombre), jefe:personal_socios!puntas_jefe_punta_socio_id_fkey(nombre)")
          .order("nombre", { ascending: true }),
        supabase.from("punta_asociados").select("*, puntas(nombre), personal_socios(nombre)"),
        supabase.from("personal_socios").select("id, nombre").order("nombre", { ascending: true }),
        supabase.from("lugares_trabajo").select("*").order("id", { ascending: true }),
        supabase.from("turnos_trabajo").select("*").order("orden", { ascending: true }),
        supabase.from("directorio_cooperativa").select("*, personal_socios(nombre)").order("id", { ascending: true }),
        supabase
          .from("coordinadores_lugar")
          .select("*, lugares_trabajo(nombre), turnos_trabajo(nombre), personal_socios(nombre)")
          .order("id", { ascending: true }),
      ]);

    if (puntasRes.error) {
      setMensaje(
        `La base aun no tiene el modelo de puntas: ${puntasRes.error.message}. Ejecuta docs/supabase-modelo-operativo-minero.sql en Supabase.`
      );
      setPuntas([]);
    } else {
      setPuntas(puntasRes.data || []);
    }

    if (!asociadosRes.error) setAsociados(asociadosRes.data || []);
    if (!sociosRes.error) setSocios(sociosRes.data || []);
    if (!lugaresRes.error) setLugares(lugaresRes.data || []);
    if (!turnosRes.error) setTurnos(turnosRes.data || []);
    if (!directorioRes.error) setDirectorio(directorioRes.data || []);
    if (!coordRes.error) setCoordinadores(coordRes.data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const asociadosPorPunta = useMemo(() => {
    return asociados.reduce((acc, item) => {
      acc[item.punta_id] ||= [];
      acc[item.punta_id].push(item);
      return acc;
    }, {});
  }, [asociados]);

  const registrarPunta = async (e) => {
    e.preventDefault();
    if (!puntaForm.nombre.trim()) {
      setMensaje("Primero registra el nombre de la punta.");
      return;
    }

    const { error } = await supabase.from("puntas").insert([
      {
        nombre: puntaForm.nombre.trim(),
        estado: puntaForm.estado,
        observaciones: puntaForm.observaciones || null,
      },
    ]);

    if (error) setMensaje(`Error al registrar punta: ${error.message}`);
    else {
      setMensaje("Punta registrada. Ahora puedes asignar asociados y autoridades.");
      setPuntaForm(PUNTA_INICIAL);
      cargarDatos();
    }
  };

  const asignarSocio = async (e) => {
    e.preventDefault();
    if (!asignacion.punta_id || !asignacion.socio_id) {
      setMensaje("Selecciona una punta y un asociado.");
      return;
    }

    const { error } = await supabase.from("punta_asociados").insert([
      {
        punta_id: Number(asignacion.punta_id),
        socio_id: Number(asignacion.socio_id),
        rol: asignacion.rol,
        estado: "Activo",
      },
    ]);

    if (error) setMensaje(`Error al asignar asociado: ${error.message}`);
    else {
      setMensaje("Asociado agregado a la punta.");
      setAsignacion({ punta_id: asignacion.punta_id, socio_id: "", rol: "Asociado" });
      cargarDatos();
    }
  };

  const asignarAutoridades = async (e) => {
    e.preventDefault();
    if (!autoridad.punta_id) {
      setMensaje("Selecciona la punta para asignar delegado y jefe.");
      return;
    }

    const { error } = await supabase
      .from("puntas")
      .update({
        delegado_socio_id: autoridad.delegado_socio_id ? Number(autoridad.delegado_socio_id) : null,
        jefe_punta_socio_id: autoridad.jefe_punta_socio_id ? Number(autoridad.jefe_punta_socio_id) : null,
      })
      .eq("id", Number(autoridad.punta_id));

    if (error) setMensaje(`Error al asignar delegado/jefe: ${error.message}`);
    else {
      setMensaje("Delegado y jefe de punta actualizados.");
      setAutoridad({ punta_id: "", delegado_socio_id: "", jefe_punta_socio_id: "" });
      cargarDatos();
    }
  };

  const registrarDirectorio = async (e) => {
    e.preventDefault();
    if (!dirForm.socio_id || !dirForm.cargo) {
      setMensaje("Selecciona socio y cargo del directorio.");
      return;
    }

    const { error } = await supabase.from("directorio_cooperativa").insert([
      {
        socio_id: Number(dirForm.socio_id),
        cargo: dirForm.cargo,
        estado: dirForm.estado,
      },
    ]);

    if (error) setMensaje(`Error al registrar directorio: ${error.message}`);
    else {
      setMensaje("Miembro del directorio registrado.");
      setDirForm({ socio_id: "", cargo: "Presidente", estado: "Activo" });
      cargarDatos();
    }
  };

  const registrarCoordinador = async (e) => {
    e.preventDefault();
    if (!coordForm.lugar_trabajo_id || !coordForm.socio_id) {
      setMensaje("Selecciona lugar de trabajo y coordinador.");
      return;
    }

    const { error } = await supabase.from("coordinadores_lugar").insert([
      {
        lugar_trabajo_id: Number(coordForm.lugar_trabajo_id),
        socio_id: Number(coordForm.socio_id),
        turno_id: coordForm.turno_id ? Number(coordForm.turno_id) : null,
        estado: coordForm.estado,
      },
    ]);

    if (error) setMensaje(`Error al registrar coordinador: ${error.message}`);
    else {
      setMensaje("Coordinador registrado.");
      setCoordForm({ lugar_trabajo_id: "", socio_id: "", turno_id: "", estado: "Activo" });
      cargarDatos();
    }
  };

  return (
    <>
      <NavPrincipal />
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Puntas y Organizacion</h1>
            <p className="mt-1 text-slate-600">
              Registra la punta, asigna sus 12 a 13 asociados, define delegado, jefe de punta, directorio y coordinadores.
            </p>
          </div>

          {mensaje && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {mensaje}
            </div>
          )}

          <section className="grid gap-6 xl:grid-cols-[410px_1fr]">
            <div className="space-y-6">
              <form onSubmit={registrarPunta} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">1. Registrar punta</h2>
                <div className="mt-5 space-y-4">
                  <input
                    value={puntaForm.nombre}
                    onChange={(e) => setPuntaForm({ ...puntaForm, nombre: e.target.value })}
                    placeholder="Nombre de la punta"
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                  <select
                    value={puntaForm.estado}
                    onChange={(e) => setPuntaForm({ ...puntaForm, estado: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option>Activa</option>
                    <option>En descanso</option>
                    <option>Inactiva</option>
                  </select>
                  <textarea
                    rows="2"
                    value={puntaForm.observaciones}
                    onChange={(e) => setPuntaForm({ ...puntaForm, observaciones: e.target.value })}
                    placeholder="Observaciones"
                    className="w-full rounded-md border border-slate-300 px-3 py-2"
                  />
                  <button className="w-full rounded-md bg-blue-700 px-4 py-3 font-semibold text-white">
                    Registrar punta
                  </button>
                </div>
              </form>

              <form onSubmit={asignarSocio} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">2. Asignar asociados</h2>
                <div className="mt-5 space-y-4">
                  <select
                    value={asignacion.punta_id}
                    onChange={(e) => setAsignacion({ ...asignacion, punta_id: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">Seleccionar punta</option>
                    {puntas.map((punta) => (
                      <option key={punta.id} value={punta.id}>{punta.nombre}</option>
                    ))}
                  </select>
                  <select
                    value={asignacion.socio_id}
                    onChange={(e) => setAsignacion({ ...asignacion, socio_id: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">Seleccionar asociado</option>
                    {socios.map((socio) => (
                      <option key={socio.id} value={socio.id}>{socio.nombre}</option>
                    ))}
                  </select>
                  <select
                    value={asignacion.rol}
                    onChange={(e) => setAsignacion({ ...asignacion, rol: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option>Asociado</option>
                    <option>Delegado</option>
                    <option>Jefe de punta</option>
                  </select>
                  <button className="w-full rounded-md bg-slate-900 px-4 py-3 font-semibold text-white">
                    Agregar asociado
                  </button>
                </div>
              </form>

              <form onSubmit={asignarAutoridades} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">3. Delegado y jefe</h2>
                <div className="mt-5 space-y-4">
                  <select
                    value={autoridad.punta_id}
                    onChange={(e) => setAutoridad({ ...autoridad, punta_id: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">Seleccionar punta</option>
                    {puntas.map((punta) => (
                      <option key={punta.id} value={punta.id}>{punta.nombre}</option>
                    ))}
                  </select>
                  <select
                    value={autoridad.delegado_socio_id}
                    onChange={(e) => setAutoridad({ ...autoridad, delegado_socio_id: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">Delegado</option>
                    {socios.map((socio) => (
                      <option key={socio.id} value={socio.id}>{socio.nombre}</option>
                    ))}
                  </select>
                  <select
                    value={autoridad.jefe_punta_socio_id}
                    onChange={(e) => setAutoridad({ ...autoridad, jefe_punta_socio_id: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">Jefe de punta</option>
                    {socios.map((socio) => (
                      <option key={socio.id} value={socio.id}>{socio.nombre}</option>
                    ))}
                  </select>
                  <button className="w-full rounded-md bg-indigo-700 px-4 py-3 font-semibold text-white">
                    Guardar autoridades
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-6">
              <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900">Puntas registradas</h2>
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                        <th className="px-3 py-3">Punta</th>
                        <th className="px-3 py-3">Delegado</th>
                        <th className="px-3 py-3">Jefe</th>
                        <th className="px-3 py-3">Asociados</th>
                        <th className="px-3 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {puntas.map((punta) => {
                        const lista = asociadosPorPunta[punta.id] || [];
                        const fueraRango = lista.length > 0 && (lista.length < 12 || lista.length > 13);
                        return (
                          <tr key={punta.id} className="border-b border-slate-100 align-top">
                            <td className="px-3 py-3">
                              <p className="font-bold text-slate-900">{punta.nombre}</p>
                              <p className="text-xs text-slate-500">{punta.observaciones}</p>
                              {lista.length > 0 && (
                                <p className="mt-2 text-xs text-slate-500">
                                  {lista.map((item) => item.personal_socios?.nombre).filter(Boolean).join(", ")}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-3">{punta.delegado?.nombre || "-"}</td>
                            <td className="px-3 py-3">{punta.jefe?.nombre || "-"}</td>
                            <td className="px-3 py-3">
                              <span className={fueraRango ? "font-bold text-amber-700" : "font-bold text-emerald-700"}>
                                {lista.length}
                              </span>
                              <span className="text-slate-500"> / 12-13</span>
                            </td>
                            <td className="px-3 py-3">{punta.estado}</td>
                          </tr>
                        );
                      })}
                      {puntas.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-3 py-8 text-center text-slate-500">
                            No hay puntas registradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-2">
                <form onSubmit={registrarDirectorio} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900">Directorio</h2>
                  <div className="mt-5 space-y-4">
                    <select
                      value={dirForm.socio_id}
                      onChange={(e) => setDirForm({ ...dirForm, socio_id: e.target.value })}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                    >
                      <option value="">Socio</option>
                      {socios.map((socio) => (
                        <option key={socio.id} value={socio.id}>{socio.nombre}</option>
                      ))}
                    </select>
                    <select
                      value={dirForm.cargo}
                      onChange={(e) => setDirForm({ ...dirForm, cargo: e.target.value })}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                    >
                      <option>Presidente</option>
                      <option>Vicepresidente</option>
                      <option>Secretario</option>
                      <option>Tesorero</option>
                      <option>Vocal</option>
                      <option>Fiscal</option>
                    </select>
                    <button className="w-full rounded-md bg-emerald-700 px-4 py-3 font-semibold text-white">
                      Registrar directorio
                    </button>
                  </div>
                  <div className="mt-5 space-y-2 text-sm">
                    {directorio.map((item) => (
                      <div key={item.id} className="rounded-md bg-slate-50 p-3">
                        <p className="font-bold text-slate-900">{item.cargo}</p>
                        <p className="text-slate-600">{item.personal_socios?.nombre}</p>
                      </div>
                    ))}
                  </div>
                </form>

                <form onSubmit={registrarCoordinador} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900">Coordinadores por lugar</h2>
                  <div className="mt-5 space-y-4">
                    <select
                      value={coordForm.lugar_trabajo_id}
                      onChange={(e) => setCoordForm({ ...coordForm, lugar_trabajo_id: e.target.value })}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                    >
                      <option value="">Lugar</option>
                      {lugares.map((lugar) => (
                        <option key={lugar.id} value={lugar.id}>{lugar.nombre}</option>
                      ))}
                    </select>
                    <select
                      value={coordForm.socio_id}
                      onChange={(e) => setCoordForm({ ...coordForm, socio_id: e.target.value })}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                    >
                      <option value="">Coordinador</option>
                      {socios.map((socio) => (
                        <option key={socio.id} value={socio.id}>{socio.nombre}</option>
                      ))}
                    </select>
                    <select
                      value={coordForm.turno_id}
                      onChange={(e) => setCoordForm({ ...coordForm, turno_id: e.target.value })}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
                    >
                      <option value="">Todos los turnos</option>
                      {turnos.map((turno) => (
                        <option key={turno.id} value={turno.id}>{turno.nombre}</option>
                      ))}
                    </select>
                    <button className="w-full rounded-md bg-orange-700 px-4 py-3 font-semibold text-white">
                      Registrar coordinador
                    </button>
                  </div>
                  <div className="mt-5 space-y-2 text-sm">
                    {coordinadores.map((item) => (
                      <div key={item.id} className="rounded-md bg-slate-50 p-3">
                        <p className="font-bold text-slate-900">{item.lugares_trabajo?.nombre}</p>
                        <p className="text-slate-600">{item.personal_socios?.nombre}</p>
                        <p className="text-xs text-slate-500">{item.turnos_trabajo?.nombre || "Todos los turnos"}</p>
                      </div>
                    ))}
                  </div>
                </form>
              </section>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
