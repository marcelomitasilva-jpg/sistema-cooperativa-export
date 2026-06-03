"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import NavPrincipal from '@/components/NavPrincipal';

export default function PanelAuditoria() {
  const [movimientos, setMovimientos] = useState([]);

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase.from('almacen_movimientos_auditado').select('*');
      setMovimientos(data || []);
    }
    loadData();
  }, []);

  return (
    <>
      <NavPrincipal />
      <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">Panel de Auditoría de la Comisión</h1>
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 border">Ítem</th>
            <th className="p-3 border">Cantidad</th>
            <th className="p-3 border">Recibido por</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => (
            <tr key={m.id_movimiento} className="border-b">
              <td className="p-3 border">{m.item_nombre}</td>
              <td className="p-3 border">{m.cantidad}</td>
              <td className="p-3 border">{Array.isArray(m.recibido_por) ? m.recibido_por.join(', ') : m.recibido_por}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}