"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import NavPrincipal from '@/components/NavPrincipal';

export default function ContabilidadPage() {
  const [cuentas, setCuentas] = useState([]);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    tipo_cuenta: 'Activo',
    descripcion: '',
    saldo_inicial: 0
  });
  const [editingId, setEditingId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const tiposCuenta = ['Activo', 'Pasivo', 'Capital', 'Ingresos', 'Gastos'];

  const obtenerCuentas = async () => {
    try {
      const { data, error } = await supabase
        .from('plan_cuentas')
        .select('*')
        .order('codigo', { ascending: true });
      if (error) throw error;
      setCuentas(data || []);
    } catch (error) {
      console.error('Error al obtener cuentas:', error);
      setMensaje('❌ Error al cargar las cuentas');
    }
  };

  useEffect(() => {
    obtenerCuentas();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.codigo || !formData.nombre) {
      setMensaje('⚠️ Complete código y nombre de la cuenta');
      return;
    }

    setCargando(true);
    setMensaje('');

    try {
      if (editingId) {
        const { error } = await supabase
          .from('plan_cuentas')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
        setMensaje('✅ Cuenta actualizada exitosamente');
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from('plan_cuentas')
          .insert([formData]);
        if (error) throw error;
        setMensaje('✅ Cuenta creada exitosamente');
      }

      setFormData({
        codigo: '',
        nombre: '',
        tipo_cuenta: 'Activo',
        descripcion: '',
        saldo_inicial: 0
      });
      obtenerCuentas();
    } catch (error) {
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const handleEdit = (cuenta) => {
    setFormData(cuenta);
    setEditingId(cuenta.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de que desea eliminar esta cuenta?')) return;

    try {
      const { error } = await supabase
        .from('plan_cuentas')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setMensaje('✅ Cuenta eliminada');
      obtenerCuentas();
    } catch (error) {
      setMensaje(`❌ Error al eliminar: ${error.message}`);
    }
  };

  const handleCancel = () => {
    setFormData({
      codigo: '',
      nombre: '',
      tipo_cuenta: 'Activo',
      descripcion: '',
      saldo_inicial: 0
    });
    setEditingId(null);
  };

  const obtenerColorTipo = (tipo) => {
    const colores = {
      'Activo': '#10b981',
      'Pasivo': '#ef4444',
      'Capital': '#8b5cf6',
      'Ingresos': '#06b6d4',
      'Gastos': '#f97316'
    };
    return colores[tipo] || '#6b7280';
  };

  return (
    <>
      <NavPrincipal />
      <div className="min-h-screen bg-slate-100 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Plan de Cuentas</h1>
            <p className="text-gray-600">Gestiona la estructura contable de la cooperativa</p>
          </div>

          {/* Formulario */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              {editingId ? '✏️ Editar Cuenta' : '➕ Nueva Cuenta'}
            </h2>

            {mensaje && (
              <div className={`mb-4 p-3 rounded ${
                mensaje.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {mensaje}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Código</label>
                  <input
                    type="text"
                    placeholder="ej: 1000"
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de la Cuenta</label>
                  <input
                    type="text"
                    placeholder="ej: Caja"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Cuenta</label>
                  <select
                    value={formData.tipo_cuenta}
                    onChange={(e) => setFormData({...formData, tipo_cuenta: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {tiposCuenta.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Saldo Inicial (Bs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.saldo_inicial}
                    onChange={(e) => setFormData({...formData, saldo_inicial: parseFloat(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                <textarea
                  placeholder="Descripción detallada de la cuenta..."
                  rows="3"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={cargando}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {cargando ? 'Guardando...' : editingId ? '💾 Actualizar' : '➕ Crear Cuenta'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Tabla de Cuentas */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Cuentas Registradas ({cuentas.length})</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Código</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Saldo Inicial</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentas.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        No hay cuentas registradas aún
                      </td>
                    </tr>
                  ) : (
                    cuentas.map((cuenta) => (
                      <tr key={cuenta.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{cuenta.codigo}</td>
                        <td className="px-6 py-4 text-sm text-gray-800">{cuenta.nombre}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className="px-3 py-1 rounded-full text-white text-xs font-semibold"
                            style={{ backgroundColor: obtenerColorTipo(cuenta.tipo_cuenta) }}
                          >
                            {cuenta.tipo_cuenta}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                          {parseFloat(cuenta.saldo_inicial || 0).toFixed(2)} Bs.
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <button
                            onClick={() => handleEdit(cuenta)}
                            className="text-blue-600 hover:text-blue-800 mr-3 font-semibold"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDelete(cuenta.id)}
                            className="text-red-600 hover:text-red-800 font-semibold"
                          >
                            🗑️ Eliminar
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
