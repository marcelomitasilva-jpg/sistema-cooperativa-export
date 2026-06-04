"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import NavPrincipal from '@/components/NavPrincipal';
import { registrarAsientoContable } from '@/lib/asientos-contables';

export default function AdminPage() {
  const [gastos, setGastos] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);

  // Obtener todos los gastos de la cooperativa en tiempo real
  const obtenerGastos = async () => {
    try {
      const { data, error } = await supabase
        .from('rendiciones_gastos')
        .select('*')
        .order('id_gasto', { ascending: false });
      if (error) throw error;
      setGastos(data || []);
    } catch (error) {
      console.error('Error al obtener datos:', error.message);
    }
  };

  useEffect(() => {
    obtenerGastos();
  }, []);

  // ACCIÓN MAESTRA: Cambiar el estado del gasto (Aprobar / Rechazar)
  const cambiarEstadoGasto = async (id, nuevoEstado) => {
    setProcesandoId(id);
    try {
      const { error } = await supabase
        .from('rendiciones_gastos')
        .update({ estado: nuevoEstado })
        .eq('id_gasto', id);

      if (error) throw error;

      let avisoAsiento = '';
      const gasto = gastos.find((item) => item.id_gasto === id);
      if (nuevoEstado === 'aprobado' && gasto) {
        const asiento = await registrarAsientoContable(supabase, {
          modulo_origen: 'rendiciones',
          referencia_id: id,
          descripcion: `Aprobacion de rendicion: ${gasto.concepto || gasto.categoria || id}`,
          debe: Number(gasto.monto || 0),
          haber: Number(gasto.monto || 0),
        });
        avisoAsiento = asiento.ok
          ? ' Asiento contable generado.'
          : ' Estado actualizado; el asiento contable queda pendiente de configurar.';
      }

      setMensaje(`Gasto #${id} actualizado a '${nuevoEstado}' con exito.${avisoAsiento}`);
      setTimeout(() => setMensaje(''), 4000); // Limpiar mensaje después de 4 segundos
      obtenerGastos(); // Recargar la lista actualizada
    } catch (error) {
      alert(`❌ Error al actualizar estado: ${error.message}`);
    } finally {
      setProcesandoId(null);
    }
  };

  // Cálculos financieros automáticos
  const totalRendido = gastos.reduce((total, g) => total + parseFloat(g.monto || 0), 0);
  const totalAprobado = gastos.filter(g => g.estado === 'aprobado').reduce((total, g) => total + parseFloat(g.monto || 0), 0);
  const totalPendiente = gastos.filter(g => g.estado === 'pendiente' || !g.estado).reduce((total, g) => total + parseFloat(g.monto || 0), 0);

  // Estilos visuales dinámicos para los Badges de Estado
  const obtenerEstiloBadge = (estado) => {
    const base = { padding: '5px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', display: 'inline-block' };
    if (estado === 'aprobado') return { ...base, backgroundColor: '#dcfce7', color: '#15803d' };
    if (estado === 'rechazado') return { ...base, backgroundColor: '#fee2e2', color: '#b91c1c' };
    return { ...base, backgroundColor: '#fef9c3', color: '#a16207' }; // pendiente
  };

  return (
    <>
      <NavPrincipal />
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '24px 16px' }}>
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }}>
      
      {/* Encabezado Principal */}
      <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e3a8a', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>Panel de Control Financiero</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Auditoría y Aprobación de Comisiones</p>
        </div>
        <button onClick={obtenerGastos} style={{ backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' }}>
            🔄 Actualizar Lista
          </button>
      </div>

      {mensaje && (
        <div style={{ padding: '12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', borderRadius: '8px', textAlign: 'center', marginBottom: '24px', fontSize: '14px', fontWeight: '500' }}>
          {mensaje}
        </div>
      )}

      {/* Bloque de Indicadores Contables (KPIs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Descargado</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginTop: '6px' }}>{totalRendido.toFixed(2)} Bs</div>
        </div>
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '20px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#166534', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Presupuesto Aprobado</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#15803d', marginTop: '6px' }}>{totalAprobado.toFixed(2)} Bs</div>
        </div>
        <div style={{ backgroundColor: '#fffbp5', border: '1px solid #fef08a', padding: '20px', borderRadius: '8px' }}>
          <span style={{ fontSize: '11px', color: '#854d0e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Por Revisar / Pendiente</span>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#a16207', marginTop: '6px' }}>{totalPendiente.toFixed(2)} Bs</div>
        </div>
      </div>

      {/* Tabla de Auditoría Avanzada */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', minWidth: '700px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '14px 10px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>ID</th>
              <th style={{ padding: '14px 10px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Detalle / Concepto del Socio</th>
              <th style={{ padding: '14px 10px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>Documento</th>
              <th style={{ padding: '14px 10px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>Estado</th>
              <th style={{ padding: '14px 10px', textAlign: 'right', color: '#475569', fontWeight: '600' }}>Importe</th>
              <th style={{ padding: '14px 10px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>Acciones de Control</th>
            </tr>
          </thead>
          <tbody>
            {gastos.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No se han encontrado registros de gastos en el sistema.</td>
              </tr>
            ) : (
              gastos.map((g) => (
                <tr key={g.id_gasto} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: procesandoId === g.id_gasto ? '#f8fafc' : 'transparent', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '14px 10px', color: '#64748b', fontWeight: '500' }}>#{g.id_gasto}</td>
                  <td style={{ padding: '14px 10px' }}>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{g.categoria}</span>
                    <div style={{ color: '#64748b', fontSize: '12px', marginTop: '3px', maxWidth: '340px' }}>{g.concepto}</div>
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {g.url_foto ? (
                      <a href={g.url_foto} target="_blank" rel="noreferrer" style={{ display: 'inline-block', color: '#0284c7', textDecoration: 'none', fontWeight: '600', backgroundColor: '#e0f2fe', padding: '5px 10px', borderRadius: '4px', fontSize: '11px' }}>👁️ Ver Doc</a>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '12px' }}>Sin Soporte</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <span style={obtenerEstiloBadge(g.estado)}>{g.estado || 'pendiente'}</span>
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>
                    {parseFloat(g.monto).toFixed(2)} Bs
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => cambiarEstadoGasto(g.id_gasto, 'aprobado')} 
                        disabled={procesandoId !== null || g.estado === 'aprobado'}
                        style={{ backgroundColor: g.estado === 'aprobado' ? '#e2e8f0' : '#10b981', color: g.estado === 'aprobado' ? '#94a3b8' : '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: g.estado === 'aprobado' ? 'not-allowed' : 'pointer', transition: '0.2s' }}
                      >
                        ✓ Aprobar
                      </button>
                      <button 
                        onClick={() => cambiarEstadoGasto(g.id_gasto, 'rechazado')} 
                        disabled={procesandoId !== null || g.estado === 'rechazado'}
                        style={{ backgroundColor: g.estado === 'rechazado' ? '#e2e8f0' : '#ef4444', color: g.estado === 'rechazado' ? '#94a3b8' : '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: g.estado === 'rechazado' ? 'not-allowed' : 'pointer', transition: '0.2s' }}
                      >
                        ✕ Rechazar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
      </div>
    </>
  );
}
