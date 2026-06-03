"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import NavPrincipal from '@/components/NavPrincipal';

export default function AlmacenForm() {
  const [socios, setSocios] = useState([]);
  const [distribuidores, setDistribuidores] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    item_nombre: '',
    cantidad: '',
    tipo_movimiento: 'Ingreso',
    distribuidor_id: '',
    recibido_por: []
  });

  useEffect(() => {
    async function fetchData() {
      const { data: s } = await supabase.from('personal_socios').select('id, nombre');
      const { data: d } = await supabase.from('distribuidores').select('id, nombre');
      setSocios(s || []);
      setDistribuidores(d || []);
    }
    fetchData();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // Validación de distribuidor - REQUERIDO
    if (!formData.distribuidor_id || formData.distribuidor_id === '') {
      newErrors.distribuidor_id = 'El distribuidor es obligatorio para registrar cualquier movimiento';
    }

    // Validación de nombre de ítem
    if (!formData.item_nombre || formData.item_nombre.trim() === '') {
      newErrors.item_nombre = 'El nombre del ítem es requerido';
    }

    // Validación de cantidad
    if (!formData.cantidad || formData.cantidad <= 0) {
      newErrors.cantidad = 'La cantidad debe ser mayor a 0';
    }

    // Validación de quién recibió
    if (!formData.recibido_por || formData.recibido_por.length === 0) {
      newErrors.recibido_por = 'Debe seleccionar quién recibió el movimiento';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar antes de enviar
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const dataToSubmit = {
      ...formData,
      distribuidor_id: parseInt(formData.distribuidor_id)
    };

    const { error } = await supabase.from('almacen_movimientos_auditado').insert([dataToSubmit]);
    
    setLoading(false);
    
    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("¡Registro exitoso!");
        setFormData({ item_nombre: '', cantidad: '', tipo_movimiento: 'Ingreso', distribuidor_id: '', recibido_por: [] });
        setErrors({});
    }
  };

  return (
    <>
      <NavPrincipal />
      <div className="min-h-screen bg-slate-100 px-4 py-8">
    <div className="max-w-lg mx-auto p-6 bg-white rounded shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Control de Almacén</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campo Nombre del Ítem */}
        <div>
          <input 
            className={`border p-2 w-full rounded ${errors.item_nombre ? 'border-red-500 bg-red-50' : ''}`}
            placeholder="Nombre del Ítem" 
            value={formData.item_nombre} 
            onChange={e => {
              setFormData({...formData, item_nombre: e.target.value});
              if (errors.item_nombre) setErrors({...errors, item_nombre: ''});
            }} 
          />
          {errors.item_nombre && <p className="text-red-600 text-sm mt-1">{errors.item_nombre}</p>}
        </div>

        {/* Campo Cantidad */}
        <div>
          <input 
            type="number" 
            className={`border p-2 w-full rounded ${errors.cantidad ? 'border-red-500 bg-red-50' : ''}`}
            placeholder="Cantidad" 
            value={formData.cantidad} 
            onChange={e => {
              setFormData({...formData, cantidad: e.target.value});
              if (errors.cantidad) setErrors({...errors, cantidad: ''});
            }} 
          />
          {errors.cantidad && <p className="text-red-600 text-sm mt-1">{errors.cantidad}</p>}
        </div>

        {/* Campo Distribuidor - OBLIGATORIO */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Distribuidor <span className="text-red-600">*</span>
          </label>
          <select 
            className={`border p-2 w-full rounded font-semibold ${errors.distribuidor_id ? 'border-red-500 bg-red-50' : 'border-green-400'}`}
            value={formData.distribuidor_id} 
            onChange={e => {
              setFormData({...formData, distribuidor_id: e.target.value});
              if (errors.distribuidor_id) setErrors({...errors, distribuidor_id: ''});
            }}
          >
            <option value="">Seleccione Distribuidor (Requerido)</option>
            {distribuidores.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
          {errors.distribuidor_id && <p className="text-red-600 text-sm mt-1">⚠️ {errors.distribuidor_id}</p>}
          {formData.distribuidor_id && !errors.distribuidor_id && <p className="text-green-600 text-sm mt-1">✓ Distribuidor seleccionado</p>}
        </div>

        {/* Campo Recibido por */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Recibido por <span className="text-red-600">*</span>
          </label>
          <select 
            className={`border p-2 w-full rounded ${errors.recibido_por ? 'border-red-500 bg-red-50' : ''}`}
            onChange={e => {
              setFormData({...formData, recibido_por: [e.target.value]});
              if (errors.recibido_por) setErrors({...errors, recibido_por: ''});
            }}
            value={formData.recibido_por[0] || ''}
          >
            <option value="">Seleccione Socio</option>
            {socios.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
          </select>
          {errors.recibido_por && <p className="text-red-600 text-sm mt-1">{errors.recibido_por}</p>}
        </div>

        {/* Tipo de Movimiento */}
        <div>
          <select 
            className="border p-2 w-full rounded"
            value={formData.tipo_movimiento}
            onChange={e => setFormData({...formData, tipo_movimiento: e.target.value})}
          >
            <option value="Ingreso">Ingreso</option>
            <option value="Egreso">Egreso</option>
            <option value="Traspaso">Traspaso</option>
          </select>
        </div>

        {/* Botón Submit - Deshabilitado si hay errores o campos vacíos */}
        <button 
          type="submit" 
          disabled={loading || !formData.distribuidor_id || !formData.item_nombre || !formData.cantidad}
          className={`w-full p-3 rounded-lg font-bold transition ${
            loading || !formData.distribuidor_id || !formData.item_nombre || !formData.cantidad
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {loading ? 'Guardando...' : 'Guardar Movimiento'}
        </button>
      </form>
    </div>
      </div>
    </>
  );
}
