"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import NavPrincipal from '@/components/NavPrincipal';

export default function AsistenciasPage() {
  const [socios, setSocios] = useState([]);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [evento, setEvento] = useState('Faena');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const getSocios = async () => {
      const { data, error } = await supabase
        .from('personal_socios')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) {
        setMensaje(`Error al cargar socios: ${error.message}`);
        return;
      }

      setSocios(data || []);
    };
    getSocios();
  }, []);

  const marcar = async (socioId, presente) => {
    const { error } = await supabase
      .from('asistencias_fallas')
      .insert([{ socio_id: Number(socioId), fecha, presente, evento }]);

    if (error) {
      setMensaje(`Error al registrar asistencia: ${error.message}`);
      return;
    }

    setMensaje('Asistencia registrada correctamente.');
  };

  return (
    <>
      <NavPrincipal />
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Control de Asistencia</h1>
        {mensaje && (
          <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {mensaje}
          </div>
        )}
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <input type="date" className="p-2 border rounded shadow-sm" value={fecha} onChange={e => setFecha(e.target.value)} />
          <select className="p-2 border rounded shadow-sm" value={evento} onChange={e => setEvento(e.target.value)}>
            <option value="Faena">Faena</option>
            <option value="Asamblea">Asamblea</option>
            <option value="Turno en Puntas">Turno en Puntas</option>
            <option value="Reunion Directiva">Reunion Directiva</option>
          </select>
        </div>
        <div className="space-y-4">
          {socios.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow border">
              <span className="font-medium">{s.nombre}</span>
              <div className="flex gap-2">
                <button onClick={() => marcar(s.id, true)} className="bg-green-500 text-white px-3 py-1 rounded text-sm">Presente</button>
                <button onClick={() => marcar(s.id, false)} className="bg-red-500 text-white px-3 py-1 rounded text-sm">Falta</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

