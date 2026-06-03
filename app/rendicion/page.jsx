"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import NavPrincipal from '@/components/NavPrincipal';

export default function RendicionPage() {
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [categoria, setCategoria] = useState('Compra de Repuestos');
  const [foto, setFoto] = useState(null);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [cargando, setCargando] = useState(false);
  const [analizandoIA, setAnalizandoIA] = useState(false);
  const [gastos, setGastos] = useState([]);
  const saldoInicial = 1500.00;

  const obtenerGastos = async () => {
    try {
      const { data, error } = await supabase
        .from('rendiciones_gastos')
        .select('*')
        .order('id_gasto', { ascending: false });
      if (error) throw error;
      setGastos(data || []);
    } catch (error) {
      console.error('Error al obtener gastos:', error.message);
    }
  };

  useEffect(() => {
    obtenerGastos();
  }, []);

  const totalGastado = gastos.reduce((total, gasto) => total + parseFloat(gasto.monto || 0), 0);
  const saldoRestante = saldoInicial - totalGastado;

  const archivoABase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

  const analizarReciboConIA = async () => {
    if (!foto) {
      setMensaje({ texto: '⚠️ Primero debes seleccionar o tomar una foto de un recibo.', tipo: 'advertencia' });
      return;
    }

    setAnalizandoIA(true);
    setMensaje({ texto: '🧠 La IA está analizando visualmente el comprobante...', tipo: 'info' });

    try {
      const base64Data = await archivoABase64(foto);
      
      const res = await fetch('/api/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagenBase64: base64Data, mimeType: foto.type })
      });

      const resultado = await res.json();

      if (resultado.error) throw new Error(resultado.error);

      if (resultado.monto) setMonto(resultado.monto);
      if (resultado.concepto) setConcepto(resultado.concepto);
      if (resultado.categoria) setCategoria(resultado.categoria);

      setMensaje({ texto: '✨ ¡Comprobante escaneado con éxito! Por favor revise los campos completados por la IA.', tipo: 'exito' });
    } catch (error) {
      console.error(error);
      setMensaje({ texto: '❌ La IA no pudo procesar la imagen automáticamente. Intente registrar los datos manualmente.', tipo: 'error' });
    } finally {
      setAnalizandoIA(false);
    }
  };

  const handleGuardarGasto = async (e) => {
    e.preventDefault();
    if (!monto || !concepto) {
      setMensaje({ texto: '⚠️ Por favor, complete el monto y el concepto del gasto.', tipo: 'advertencia' });
      return;
    }

    setCargando(true);
    setMensaje({ texto: '', tipo: '' });
    let urlFotoPublica = null;

    try {
      if (foto) {
        const nombreArchivo = `${Date.now()}_${foto.name.replace(/\s+/g, '_')}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('recibos')
          .upload(nombreArchivo, foto);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('recibos')
          .getPublicUrl(nombreArchivo);
        
        urlFotoPublica = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('rendiciones_gastos')
        .insert([{ 
          monto: parseFloat(monto), 
          categoria, 
          concepto, 
          estado: 'pendiente',
          url_foto: urlFotoPublica 
        }]);

      if (error) throw error;

      setMensaje({ texto: `✅ Rendición registrada exitosamente en el sistema.`, tipo: 'exito' });
      setMonto('');
      setConcepto('');
      setFoto(null);
      document.getElementById('input-foto').value = '';
      obtenerGastos();
    } catch (error) {
      setMensaje({ texto: `❌ Error al guardar: ${error.message}`, tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  // Función interna para pintar los colores de los estados del mensaje corporativo
  const obtenerEstiloMensaje = (tipo) => {
    const estilosBase = { padding: '14px', borderRadius: '8px', border: '1px solid', textAlign: 'center', marginBottom: '24px', fontSize: '14px', fontWeight: '500' };
    if (tipo === 'exito') return { ...estilosBase, backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' };
    if (tipo === 'error') return { ...estilosBase, backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' };
    if (tipo === 'info') return { ...estilosBase, backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' };
    return { ...estilosBase, backgroundColor: '#fffbp5', borderColor: '#fef08a', color: '#a16207' }; // advertencia
  };

  return (
    <>
      <NavPrincipal />
      <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '24px 16px' }}>
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }}>
      
      {/* Encabezado Institucional */}
      <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '20px', marginBottom: '24px', textAlign: 'center' }}>
        <h2 style={{ margin: 0, color: '#1e3a8a', fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>Sistema de Rendiciones</h2>
        <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Módulo de Comisión para Socios</p>
      </div>

      {/* Tarjeta de Resumen Financiero */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Fondo Asignado</span>
          <div style={{ fontSize: '15px', fontWeight: '500', color: '#334155' }}>{saldoInicial.toFixed(2)} Bs</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Saldo Disp. por Rendir</span>
          <div style={{ fontSize: '20px', fontWeight: '700', color: saldoRestante < 200 ? '#b91c1c' : '#15803d' }}>{saldoRestante.toFixed(2)} Bs</div>
        </div>
      </div>

      {mensaje.texto && <div style={obtenerEstiloMensaje(mensaje.tipo)}>{mensaje.texto}</div>}

      {/* Formulario Principal */}
      <form onSubmit={handleGuardarGasto} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
        
        {/* Sección de Carga de Documento */}
        <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155', fontSize: '14px' }}>📸 Adjuntar Recibo o Factura Digital</label>
          <input id="input-foto" type="file" accept="image/*" onChange={(e) => setFoto(e.target.files[0])} style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '6px', backgroundColor: '#ffffff', boxSizing: 'border-box', border: '1px solid #cbd5e1' }} />
          
          {foto && (
            <button type="button" onClick={analizarReciboConIA} disabled={analizandoIA} style={{ width: '100%', marginTop: '12px', backgroundColor: '#4f46e5', color: '#ffffff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)' }}>
              {analizandoIA ? '🔮 Procesando documento con IA...' : '✨ Autocompletar Datos con IA'}
            </button>
          )}
        </div>

        {/* Campos de Entrada de Datos */}
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#334155', fontSize: '14px' }}>Monto Declarado (Bs.)</label>
          <input type="number" step="any" placeholder="0.00" value={monto} onChange={(e) => setMonto(e.target.value)} style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '15px', color: '#1e293b' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#334155', fontSize: '14px' }}>Categoría del Gasto</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '14px', color: '#1e293b' }}>
            <option value="Compra de Repuestos">Compra de Repuestos</option>
            <option value="Combustible / Diésel">Combustible / Diésel</option>
            <option value="Alimentación y Viáticos">Alimentación y Viáticos</option>
            <option value="Gastos Generales">Gastos Generales</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#334155', fontSize: '14px' }}>Concepto / Detalle del Gasto</label>
          <textarea placeholder="Escriba el motivo del descargo o deje que la IA lo redacte..." rows="2" value={concepto} onChange={(e) => setConcepto(e.target.value)} style={{ width: '100%', padding: '11px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', resize: 'none', fontSize: '14px', fontFamily: 'inherit', color: '#1e293b' }}></textarea>
        </div>

        <button type="submit" disabled={cargando || analizandoIA} style={{ backgroundColor: cargando ? '#94a3b8' : '#0284c7', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '15px', marginTop: '5px', boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.2)', transition: 'background-color 0.2s' }}>
          {cargando ? 'Registrando en base de datos...' : 'Enviar Rendición Oficial'}
        </button>
      </form>

      {/* Historial con diseño Corporativo */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e3a8a', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px', margin: '0 0 12px 0' }}>Comprobantes Presentados</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', color: '#64748b', fontWeight: '600' }}>Detalle de Comisión</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', color: '#64748b', fontWeight: '600' }}>Soporte</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', color: '#64748b', fontWeight: '600' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {gastos.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No existen rendiciones registradas en esta comisión.</td>
                </tr>
              ) : (
                gastos.map((g) => (
                  <tr key={g.id_gasto} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }}>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ fontWeight: '600', color: '#334155' }}>{g.categoria}</span>
                      <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{g.concepto}</div>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                      {g.url_foto ? (
                        <a href={g.url_foto} target="_blank" rel="noreferrer" style={{ display: 'inline-block', color: '#0284c7', textDecoration: 'none', fontWeight: '600', backgroundColor: '#e0f2fe', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>👁️ Ver Doc</a>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap' }}>
                      {parseFloat(g.monto).toFixed(2)} Bs
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