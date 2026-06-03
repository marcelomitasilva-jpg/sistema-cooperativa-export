"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import NavPrincipal from '@/components/NavPrincipal';

export default function SancionesPage() {
  const [socios, setSocios] = useState([]);
  const [sanciones, setSanciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    socio_id: '',
    fecha: new Date().toISOString().split('T')[0],
    tipo_sancion: 'Inasistencia Asamblea',
    monto: '100',
    motivo: '',
    estado: 'Pendiente'
  });
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const { data: s } = await supabase
        .from('personal_socios')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      const { data: san } = await supabase
          .from('sanciones_memorandums')
        .select('*, personal_socios(nombre)')
        .order('created_at', { ascending: false });

      setSocios(s || []);
      setSanciones(san || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  const procesarSancion = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        socio_id: Number(form.socio_id),
        monto: parseFloat(form.monto) || 0,
      };

      const { error } = await supabase
        .from('sanciones_memorandums')
        .insert([payload]);

      if (!error) {
        alert("Sanción y Memorándum emitido correctamente");
        setForm({ ...form, socio_id: '', motivo: '' });
        fetchData();
      } else {
        throw error;
    }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NavPrincipal />
      <div className="p-8 bg-slate-50 min-h-screen">
        <h1 className="text-3xl font-bold text-red-800 mb-8">⚖️ Disciplina y Sanciones</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600">
            <h2 className="text-xl font-bold mb-4">Emitir Sanción / Multa</h2>
            <form onSubmit={procesarSancion} className="space-y-4">
                  <select
                className="w-full p-3 border rounded"
                required
                onChange={e => setForm({...form, socio_id: e.target.value})}
                value={form.socio_id}
                  >
                <option value="">Seleccionar Socio...</option>
                {socios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <input
                type="date"
                className="w-full p-3 border rounded"
                value={form.fecha}
                onChange={e => setForm({...form, fecha: e.target.value})}
              />
              <select
                className="w-full p-3 border rounded"
                value={form.tipo_sancion}
                onChange={e => setForm({...form, tipo_sancion: e.target.value})}
                  >
                <option>Inasistencia Asamblea</option>
                <option>Falta a Faena</option>
                <option>Atraso injustificado</option>
                <option>Incumplimiento de Estatutos</option>
                  </select>
                  <input
                    type="number"
                className="w-full p-3 border rounded"
                placeholder="Monto Bs."
                value={form.monto}
                onChange={e => setForm({...form, monto: e.target.value})}
                  />
              <textarea
                className="w-full p-3 border rounded"
                placeholder="Descripción del motivo..."
                rows="3"
                value={form.motivo}
                onChange={e => setForm({...form, motivo: e.target.value})}
              />
                <button
                disabled={loading}
                className="w-full bg-red-700 text-white font-bold py-3 rounded hover:bg-red-800 transition shadow-md disabled:bg-gray-400"
                >
                {loading ? 'Procesando...' : 'GENERAR MEMORÁNDUM'}
                </button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-700">Historial de Sanciones Recientes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-sm uppercase">
                    <th className="p-3">Socio</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Monto</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {sanciones.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-3 text-center text-gray-500">No hay sanciones registradas</td>
                    </tr>
                  ) : (
                    sanciones.map(s => (
                      <tr key={s.id} className="border-b hover:bg-red-50">
                        <td className="p-3 font-semibold">{s.personal_socios?.nombre}</td>
                        <td className="p-3 text-sm text-gray-600">{s.tipo_sancion}</td>
                        <td className="p-3 font-bold">{s.monto} Bs</td>
                        <td className="p-3">
                          <span className={`${
                            s.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                          } px-2 py-1 rounded text-xs font-bold`}>
                            {s.estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

