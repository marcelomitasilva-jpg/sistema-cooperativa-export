export async function registrarAsientoContable(supabase, asiento) {
  const fecha = asiento.fecha || new Date().toISOString().slice(0, 10);
  const descripcion = asiento.descripcion || asiento.glosa || "Movimiento contable";
  const debe = Number(asiento.debe || 0);
  const haber = Number(asiento.haber || 0);

  const detalles = Array.isArray(asiento.detalles)
    ? asiento.detalles
    : [
        {
          cuenta_id: asiento.cuenta_debe_id,
          descripcion,
          debe,
          haber: 0,
        },
        {
          cuenta_id: asiento.cuenta_haber_id,
          descripcion,
          debe: 0,
          haber,
        },
      ].filter((item) => item.cuenta_id && (item.debe > 0 || item.haber > 0));

  if (detalles.length >= 2) {
    const totalDebe = detalles.reduce((total, item) => total + Number(item.debe || 0), 0);
    const totalHaber = detalles.reduce((total, item) => total + Number(item.haber || 0), 0);

    if (Math.abs(totalDebe - totalHaber) > 0.009) {
      return {
        ok: false,
        error: new Error(`Asiento descuadrado. Debe: ${totalDebe}, Haber: ${totalHaber}`),
      };
    }

    const { data: cabecera, error: cabeceraError } = await supabase
      .from("contabilidad_asientos")
      .insert([
        {
          fecha,
          periodo_id: asiento.periodo_id || null,
          numero: asiento.numero || null,
          glosa: descripcion,
          tipo: asiento.tipo || "diario",
          estado: "borrador",
          modulo_origen: asiento.modulo_origen || null,
          referencia_id: asiento.referencia_id ? String(asiento.referencia_id) : null,
          usuario_nombre: asiento.usuario_nombre || null,
        },
      ])
      .select("id")
      .single();

    if (!cabeceraError && cabecera?.id) {
      const { error: detallesError } = await supabase.from("contabilidad_asiento_detalles").insert(
        detalles.map((item) => ({
          asiento_id: cabecera.id,
          cuenta_id: item.cuenta_id,
          descripcion: item.descripcion || descripcion,
          debe: Number(item.debe || 0),
          haber: Number(item.haber || 0),
        }))
      );

      if (detallesError) {
        await supabase.from("contabilidad_asientos").delete().eq("id", cabecera.id);
        console.warn("No se pudo registrar detalle contable:", detallesError.message);
        return { ok: false, error: detallesError };
      }

      const { error: confirmarError } = await supabase
        .from("contabilidad_asientos")
        .update({ estado: asiento.estado || "confirmado" })
        .eq("id", cabecera.id);

      if (confirmarError) {
        console.warn("No se pudo confirmar asiento contable:", confirmarError.message);
        return { ok: false, error: confirmarError };
      }

      return { ok: true, error: null, id: cabecera.id };
    }
  }

  const payload = {
    fecha: asiento.fecha || new Date().toISOString().slice(0, 10),
    modulo_origen: asiento.modulo_origen,
    referencia_id: asiento.referencia_id ? String(asiento.referencia_id) : null,
    descripcion,
    debe,
    haber,
    estado: asiento.estado || "registrado",
  };

  const { error } = await supabase.from("asientos_contables").insert([payload]);

  if (error) {
    console.warn("No se pudo registrar el asiento contable:", error.message);
    return { ok: false, error };
  }

  return { ok: true, error: null };
}
