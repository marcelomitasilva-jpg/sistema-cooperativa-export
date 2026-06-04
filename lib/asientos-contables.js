export async function registrarAsientoContable(supabase, asiento) {
  const payload = {
    fecha: asiento.fecha || new Date().toISOString().slice(0, 10),
    modulo_origen: asiento.modulo_origen,
    referencia_id: asiento.referencia_id ? String(asiento.referencia_id) : null,
    descripcion: asiento.descripcion,
    debe: Number(asiento.debe || 0),
    haber: Number(asiento.haber || 0),
    estado: asiento.estado || "registrado",
  };

  const { error } = await supabase.from("asientos_contables").insert([payload]);

  if (error) {
    console.warn("No se pudo registrar el asiento contable:", error.message);
    return { ok: false, error };
  }

  return { ok: true, error: null };
}
