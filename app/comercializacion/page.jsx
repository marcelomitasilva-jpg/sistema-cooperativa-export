"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import NavPrincipal from '@/components/NavPrincipal';
import { registrarAsientoContable } from '@/lib/asientos-contables';

export default function LiquidacionesPage() {
  const [socios, setSocios] = useState([]);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [formData, setFormData] = useState({
    socio_id: '',
    peso_bruto: '',
    ley_oro: '',
    humedad: '',
    deducciones: '',
    valor_final: 0,
    fecha: new Date().toISOString().split('T')[0]
  });
  const [editingId, setEditingId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [filtroSocio, setFiltroSocio] = useState('');

  // Constantes para cálculos
  const PRECIO_ORO_POR_GRAMO = 65; // Bs por gramo (ajustable)
  const COMISION_COOPERATIVA = 0.10; // 10%

  const obtenerSocios = async () => {
    try {
      const { data, error } = await supabase
        .from('personal_socios')
        .select('id, nombre')
        .order('nombre', { ascending: true });
      if (error) throw error;
      setSocios(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const obtenerLiquidaciones = async () => {
    try {
      const { data, error } = await supabase
        .from('comercializacion_oro')
        .select('*, personal_socios(nombre)')
        .order('fecha', { ascending: false });
      if (error) throw error;
      setLiquidaciones(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    obtenerSocios();
    obtenerLiquidaciones();
  }, []);

  // Cálculo automático de valor final
  useEffect(() => {
    const calcularValor = () => {
      if (formData.peso_bruto && formData.ley_oro) {
        const pesoNeto = parseFloat(formData.peso_bruto) * (parseFloat(formData.ley_oro) / 100);
        const oroGramos = pesoNeto; // Simplificado
        const valor = oroGramos * PRECIO_ORO_POR_GRAMO;
        const deducciones = parseFloat(formData.deducciones) || 0;
        const valorFinal = valor - (valor * COMISION_COOPERATIVA) - deducciones;
        setFormData(prev => ({...prev, valor_final: valorFinal}));
      }
    };
    calcularValor();
  }, [formData.peso_bruto, formData.ley_oro, formData.deducciones]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.socio_id || !formData.peso_bruto || !formData.ley_oro) {
      setMensaje('⚠️ Complete los campos obligatorios');
      return;
    }

    setCargando(true);
    setMensaje('');

    try {
      const dataToSubmit = {
        ...formData,
        peso_bruto: parseFloat(formData.peso_bruto),
        ley_oro: parseFloat(formData.ley_oro),
        humedad: parseFloat(formData.humedad) || 0,
        deducciones: parseFloat(formData.deducciones) || 0,
        valor_final: parseFloat(formData.valor_final)
      };

      if (editingId) {
        const { error } = await supabase
          .from('comercializacion_oro')
          .update(dataToSubmit)
          .eq('id', editingId);
        if (error) throw error;
        setMensaje('✅ Liquidación actualizada');
        setEditingId(null);
      } else {
        const { data: insertData, error } = await supabase
          .from('comercializacion_oro')
          .insert([dataToSubmit])
          .select('id, valor_final, fecha')
          .single();
        if (error) throw error;

        const asiento = await registrarAsientoContable(supabase, {
          modulo_origen: 'comercializacion',
          referencia_id: insertData?.id,
          fecha: insertData?.fecha,
          descripcion: `Liquidacion de mineral socio #${dataToSubmit.socio_id}`,
          debe: Number(insertData?.valor_final || dataToSubmit.valor_final || 0),
          haber: Number(insertData?.valor_final || dataToSubmit.valor_final || 0),
        });

        setMensaje(
          asiento.ok
            ? 'Liquidación registrada y asiento contable generado'
            : 'Liquidación registrada; el asiento contable queda pendiente de configurar'
        );
      }

      setFormData({
        socio_id: '',
        peso_bruto: '',
        ley_oro: '',
        humedad: '',
        deducciones: '',
        valor_final: 0,
        fecha: new Date().toISOString().split('T')[0]
      });
      obtenerLiquidaciones();
    } catch (error) {
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleEdit = (liq) => {
    setFormData(liq);
    setEditingId(liq.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta liquidación?')) return;

    try {
      const { error } = await supabase
        .from('comercializacion_oro')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setMensaje('✅ Eliminado');
      obtenerLiquidaciones();
    } catch (error) {
      setMensaje(`❌ Error: ${error.message}`);
    }
  };

  const liquidacionesFiltradas = filtroSocio
    ? liquidaciones.filter(l => l.socio_id === parseInt(filtroSocio))
    : liquidaciones;

  const totalPagado = liquidacionesFiltradas.reduce((sum, l) => sum + (l.valor_final || 0), 0);

  return (
    <>
      <NavPrincipal />
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">💰 Liquidaciones de Mineral</h1>
            <p className="text-gray-600">Registro y gestión de pagos a socios por venta de mineral</p>
          </div>

          {/* Formulario */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? '✏️ Editar Liquidación' : '➕ Nueva Liquidación'}
            </h2>

            {mensaje && (
              <div className={`mb-4 p-3 rounded ${
                mensaje.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {mensaje}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Socio *</label>
                  <select
                    value={formData.socio_id}
                    onChange={(e) => setFormData({...formData, socio_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Seleccione socio</option>
                    {socios.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Peso Bruto (gramos) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.peso_bruto}
                    onChange={(e) => setFormData({...formData, peso_bruto: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ley de Oro (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.ley_oro}
                    onChange={(e) => setFormData({...formData, ley_oro: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Humedad (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.humedad}
                    onChange={(e) => setFormData({...formData, humedad: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Deducciones (Bs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.deducciones}
                    onChange={(e) => setFormData({...formData, deducciones: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-lg font-bold text-blue-900">
                  💵 Valor Final a Pagar: {parseFloat(formData.valor_final).toFixed(2)} Bs.
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  (Incluye comisión cooperativa {(COMISION_COOPERATIVA * 100).toFixed(0)}%)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={cargando}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
                >
                  {cargando ? 'Guardando...' : editingId ? '💾 Actualizar' : '➕ Registrar Liquidación'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormData({
                        socio_id: '',
                        peso_bruto: '',
                        ley_oro: '',
                        humedad: '',
                        deducciones: '',
                        valor_final: 0,
                        fecha: new Date().toISOString().split('T')[0]
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg font-semibold"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Filtro y Resumen */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Filtrar por Socio</label>
                <select
                  value={filtroSocio}
                  onChange={(e) => setFiltroSocio(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Ver todas las liquidaciones</option>
                  {socios.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">Total Pagado</p>
                <p className="text-2xl font-bold text-green-900">{totalPagado.toFixed(2)} Bs.</p>
              </div>
            </div>
          </div>

          {/* Tabla de Liquidaciones */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Historial de Liquidaciones ({liquidacionesFiltradas.length})</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Socio</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Fecha</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-700">Peso Bruto</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-700">Ley %</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-700">Valor Final</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {liquidacionesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        No hay liquidaciones registradas
                      </td>
                    </tr>
                  ) : (
                    liquidacionesFiltradas.map((liq) => (
                      <tr key={liq.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4 font-semibold text-gray-900">{liq.personal_socios?.nombre}</td>
                        <td className="px-6 py-4 text-gray-700">{new Date(liq.fecha).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right text-gray-700">{parseFloat(liq.peso_bruto).toFixed(2)} g</td>
                        <td className="px-6 py-4 text-right text-gray-700">{parseFloat(liq.ley_oro).toFixed(2)}%</td>
                        <td className="px-6 py-4 text-right font-bold text-green-600">{parseFloat(liq.valor_final).toFixed(2)} Bs.</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleEdit(liq)}
                            className="text-blue-600 hover:text-blue-800 mr-2 font-semibold"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(liq.id)}
                            className="text-red-600 hover:text-red-800 font-semibold"
                          >
                            🗑️
                          </button>
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
