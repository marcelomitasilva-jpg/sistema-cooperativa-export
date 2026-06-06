"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NavPrincipal from "@/components/NavPrincipal";
import { supabase } from "@/lib/supabase-client";

const TIPOS_DOCUMENTO = [
  { value: "cuaderno_egresos_revisora", label: "Cuaderno de egresos revisora" },
  { value: "caja_hacienda", label: "Libro de caja hacienda" },
  { value: "respaldo_tesoreria", label: "Respaldo tesoreria" },
  { value: "prestamo_cooperativa", label: "Prestamo a cooperativa" },
  { value: "entrega_cuenta_rendicion", label: "Entrega a cuenta / rendicion" },
  { value: "almacen", label: "Libro de almacen" },
  { value: "alzas_produccion", label: "Cuaderno de alzas / produccion" },
  { value: "ventas_oro", label: "Libro de ventas de oro" },
  { value: "otro", label: "Otro documento" },
];

const RUBROS = [
  "Combustible",
  "Explosivos",
  "Prestamos",
  "Telefono",
  "Giros",
  "Empleados",
  "Servicios externos",
  "Viaticos",
  "Gastos generales",
  "otro",
];

const FORM_INICIAL = {
  tipo_documento: "caja_hacienda",
  tipo_movimiento: "egreso",
  fuente: "manual",
  fecha_documento: "",
  folio: "",
  numero_recibo: "",
  persona: "",
  concepto: "",
  categoria: "",
  rubro: "",
  subrubro: "",
  responsable: "",
  destino: "",
  tarea: "",
  monto_ingreso: "",
  monto_egreso: "",
  monto_rendido: "",
  saldo_libro: "",
  cantidad: "",
  unidad: "",
  item: "",
  contraparte: "",
  interes_porcentaje: "",
  saldo_a_favor: "",
  saldo_en_contra: "",
  texto_extraido: "",
  confianza: "",
  observaciones: "",
};

const CAMPOS_REVISION_DOCUMENTO = [
  { key: "tipo_documento", label: "Tipo de documento" },
  { key: "tipo_movimiento", label: "Movimiento" },
  { key: "fecha_documento", label: "Fecha" },
  { key: "folio", label: "Folio" },
  { key: "numero_recibo", label: "Recibo" },
  { key: "persona", label: "Persona/proveedor" },
  { key: "concepto", label: "Concepto" },
  { key: "monto_ingreso", label: "Ingreso" },
  { key: "monto_egreso", label: "Egreso" },
  { key: "monto_rendido", label: "Rendido" },
  { key: "rubro", label: "Rubro" },
  { key: "subrubro", label: "Subrubro" },
];

const RESPALDO_INICIAL = {
  documento_id: "",
  tipo_respaldo: "recibo",
  folio: "",
  numero_recibo: "",
  fecha_respaldo: "",
  persona: "",
  detalle: "",
  monto: "",
  texto_extraido: "",
  resultado_verificacion: "pendiente",
  diferencias: [],
  confianza: "",
  observaciones: "",
};

function numero(valor) {
  const n = Number(valor || 0);
  return Number.isFinite(n) ? n : 0;
}

function opcionalNumero(valor) {
  if (valor === "" || valor === null || valor === undefined) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function limpiarDatoIa(valor) {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor).trim();
  return texto.toUpperCase() === "NO LEGIBLE" ? "" : texto;
}

function confianzaIaANumero(valor, alternativa) {
  const valorNumerico = opcionalNumero(valor);
  if (valorNumerico !== null) return valorNumerico;

  const texto = String(valor || "").trim().toLowerCase();
  if (texto === "alta") return 0.95;
  if (texto === "media") return 0.7;
  if (texto === "baja") return 0.4;

  return opcionalNumero(alternativa);
}

function moneda(valor) {
  return Number(valor || 0).toLocaleString("es-BO", {
    style: "currency",
    currency: "BOB",
  });
}

function fechaLocal(fecha) {
  if (!fecha) return "Sin fecha";
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-BO");
}

function etiquetaTipo(tipo) {
  return TIPOS_DOCUMENTO.find((item) => item.value === tipo)?.label || tipo;
}

function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function mesGestion(fecha) {
  return fecha ? fecha.slice(0, 7) : "sin_mes";
}

function referenciaAlternativa(doc) {
  return [doc.fecha_documento || "s/f", `Folio ${doc.folio || "s/f"}`, moneda(doc.monto_egreso || doc.monto_ingreso)]
    .filter(Boolean)
    .join(" / ");
}

function montoPrincipal(doc) {
  return numero(doc.monto_egreso) || numero(doc.monto_ingreso) || numero(doc.monto_rendido);
}

function montosIguales(a, b) {
  return Math.abs(montoPrincipal(a) - montoPrincipal(b)) < 0.01;
}

function descripcionCoincidencia(doc) {
  return [
    doc.fecha_documento || "s/f",
    `Rec. ${doc.numero_recibo || "s/n"}`,
    `Folio ${doc.folio || "s/f"}`,
    moneda(montoPrincipal(doc)),
    doc.concepto || "Sin detalle",
  ].join(" | ");
}

function encontrarCoincidenciasDocumento(nuevo, documentos) {
  const recibo = normalizarTexto(nuevo.numero_recibo);
  const folio = normalizarTexto(nuevo.folio);
  const fecha = nuevo.fecha_documento || "";
  const concepto = normalizarTexto(nuevo.concepto);

  return documentos
    .map((doc) => {
      let puntaje = 0;
      const motivos = [];
      const docRecibo = normalizarTexto(doc.numero_recibo);
      const docFolio = normalizarTexto(doc.folio);
      const docConcepto = normalizarTexto(doc.concepto);

      if (fecha && doc.fecha_documento === fecha) {
        puntaje += 2;
        motivos.push("misma fecha");
      }
      if (recibo && docRecibo === recibo) {
        puntaje += 4;
        motivos.push("mismo recibo");
      }
      if (folio && docFolio === folio) {
        puntaje += 3;
        motivos.push("mismo folio");
      }
      if (montosIguales(nuevo, doc) && montoPrincipal(nuevo) > 0) {
        puntaje += 3;
        motivos.push("mismo monto");
      }
      if (concepto && docConcepto && (docConcepto.includes(concepto) || concepto.includes(docConcepto))) {
        puntaje += 2;
        motivos.push("detalle parecido");
      }

      return { doc, puntaje, motivos };
    })
    .filter((item) => item.puntaje >= 7)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, 5);
}

function descargarCsv(nombreArchivo, filas) {
  const encabezados = [
    "Tipo",
    "Fecha",
    "Folio",
    "Recibo",
    "Persona",
    "Rubro",
    "Subrubro",
    "Concepto",
    "Ingreso",
    "Egreso",
    "Rendido",
    "Saldo libro",
    "Cantidad",
    "Unidad",
  ];
  const csv = [
    encabezados.join(","),
    ...filas.map((doc) =>
      [
        etiquetaTipo(doc.tipo_documento),
        doc.fecha_documento || "",
        doc.folio || "",
        doc.numero_recibo || "",
        doc.persona || "",
        doc.rubro || "",
        doc.subrubro || "",
        doc.concepto || "",
        doc.monto_ingreso || 0,
        doc.monto_egreso || 0,
        doc.monto_rendido || 0,
        doc.saldo_libro ?? "",
        doc.cantidad ?? "",
        doc.unidad || "",
      ]
        .map((valor) => `"${String(valor).replaceAll('"', '""')}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  link.click();
  URL.revokeObjectURL(url);
}

function detectarAnomalias(documentos) {
  const hallazgos = [];
  const porRecibo = new Map();
  const porFolioMes = new Map();

  documentos.forEach((doc) => {
    const recibo = (doc.numero_recibo || "").trim().toLowerCase();
    const folio = (doc.folio || "").trim().toLowerCase();
    const ingreso = numero(doc.monto_ingreso);
    const egreso = numero(doc.monto_egreso);
    const rendido = numero(doc.monto_rendido);

    if (!recibo && !folio) {
      hallazgos.push({
        severidad: "alta",
        tipo: "Sin referencia",
        descripcion: `${etiquetaTipo(doc.tipo_documento)} sin folio ni numero de recibo: ${doc.concepto}`,
      });
    } else if (!recibo && folio && doc.fecha_documento) {
      hallazgos.push({
        severidad: "media",
        tipo: "Recibo pendiente de asignar",
        descripcion: `Movimiento del ${fechaLocal(doc.fecha_documento)} con folio ${
          doc.folio
        } no tiene numero de recibo. Usar fecha y folio como guia de busqueda.`,
      });
    }

    if (ingreso > 0 && egreso > 0) {
      hallazgos.push({
        severidad: "media",
        tipo: "Ingreso y egreso en el mismo documento",
        descripcion: `Revisar recibo ${doc.numero_recibo || "s/n"}: tiene ingreso ${moneda(
          ingreso
        )} y egreso ${moneda(egreso)}.`,
      });
    }

    if (ingreso === 0 && egreso === 0 && rendido === 0 && !doc.cantidad) {
      hallazgos.push({
        severidad: "media",
        tipo: "Sin importe ni cantidad",
        descripcion: `${etiquetaTipo(doc.tipo_documento)} folio ${doc.folio || "s/f"} no tiene monto ni cantidad.`,
      });
    }

    if (doc.tipo_documento === "entrega_cuenta_rendicion" && egreso > 0 && rendido > 0) {
      const diferencia = egreso - rendido;
      if (Math.abs(diferencia) > 0.01) {
        hallazgos.push({
          severidad: "alta",
          tipo: "Rendicion descuadrada",
          descripcion: `${doc.persona || "Responsable"} recibio ${moneda(egreso)} y rindio ${moneda(
            rendido
          )}. Diferencia: ${moneda(diferencia)}.`,
        });
      }
    }

    if (recibo) {
      porRecibo.set(recibo, [...(porRecibo.get(recibo) || []), doc]);
    }
    if (folio) {
      const clave = `${doc.tipo_documento}:${mesGestion(doc.fecha_documento)}:${folio}`;
      porFolioMes.set(clave, [...(porFolioMes.get(clave) || []), doc]);
    }
  });

  porRecibo.forEach((items, recibo) => {
    if (items.length <= 1 || recibo === "s/n" || recibo === "sn") return;

    const porFechaFolio = new Map();
    const porContenido = new Map();

    items.forEach((doc) => {
      const claveFechaFolio = `${doc.fecha_documento || "sin_fecha"}:${doc.folio || "sin_folio"}`;
      const claveContenido = `${normalizarTexto(doc.concepto)}:${numero(doc.monto_ingreso)}:${numero(
        doc.monto_egreso
      )}`;
      porFechaFolio.set(claveFechaFolio, [...(porFechaFolio.get(claveFechaFolio) || []), doc]);
      porContenido.set(claveContenido, [...(porContenido.get(claveContenido) || []), doc]);
    });

    porFechaFolio.forEach((grupo) => {
      if (grupo.length > 1) {
        hallazgos.push({
          severidad: "alta",
          tipo: "Recibo repetido con misma fecha y folio",
          descripcion: `Recibo ${recibo} aparece ${grupo.length} veces con fecha ${
            grupo[0].fecha_documento || "s/f"
          } y folio ${grupo[0].folio || "s/f"}.`,
        });
      }
    });

    porContenido.forEach((grupo) => {
      if (grupo.length > 1) {
        hallazgos.push({
          severidad: "media",
          tipo: "Recibo repetido con mismo contenido",
          descripcion: `Recibo ${recibo} aparece ${grupo.length} veces con detalle y monto similares: ${
            grupo[0].concepto
          }.`,
        });
      }
    });
  });

  porFolioMes.forEach((items) => {
    if (items.length <= 1) return;

    const conMismoContenido = new Map();
    items.forEach((doc) => {
      const clave = `${normalizarTexto(doc.concepto)}:${numero(doc.monto_ingreso)}:${numero(
        doc.monto_egreso
      )}`;
      conMismoContenido.set(clave, [...(conMismoContenido.get(clave) || []), doc]);
    });

    conMismoContenido.forEach((grupo) => {
      if (grupo.length > 1) {
        hallazgos.push({
          severidad: "media",
          tipo: "Folio mensual con contenido repetido",
          descripcion: `Folio ${grupo[0].folio} del mes ${mesGestion(
            grupo[0].fecha_documento
          )} tiene ${grupo.length} movimientos con detalle y monto similares.`,
        });
      }
    });
  });

  porFolioMes.forEach((items) => {
    const fechas = new Set(items.map((item) => item.fecha_documento || ""));
    if (items.length > 1 && fechas.size === 1) {
      const recibos = new Set(items.map((item) => item.numero_recibo || ""));
      if (recibos.size === 1 && !recibos.has("")) {
        hallazgos.push({
          severidad: "alta",
          tipo: "Mismo folio, fecha y recibo",
          descripcion: `Folio ${items[0].folio} del ${fechaLocal(items[0].fecha_documento)} repite el recibo ${
            items[0].numero_recibo
          }.`,
        });
      }
    }
  });

  const alzas = documentos
    .filter((doc) => doc.tipo_documento === "alzas_produccion")
    .reduce((total, doc) => total + numero(doc.cantidad), 0);
  const ventas = documentos
    .filter((doc) => doc.tipo_documento === "ventas_oro")
    .reduce((total, doc) => total + numero(doc.cantidad), 0);

  if (alzas > 0 && ventas > 0 && Math.abs(alzas - ventas) > 0.0001) {
    hallazgos.push({
      severidad: "media",
      tipo: "Produccion vs ventas",
      descripcion: `Cantidad registrada en alzas: ${alzas}. Cantidad vendida: ${ventas}. Revisar unidad y mermas.`,
    });
  }

  return hallazgos;
}

export default function ComisionRevisoraPage() {
  const [gestiones, setGestiones] = useState([]);
  const [gestionSeleccionada, setGestionSeleccionada] = useState("");
  const [documentos, setDocumentos] = useState([]);
  const [respaldos, setRespaldos] = useState([]);
  const [form, setForm] = useState(FORM_INICIAL);
  const [revisionDocumento, setRevisionDocumento] = useState(null);
  const [permitirDuplicadoDocumento, setPermitirDuplicadoDocumento] = useState(false);
  const [filasExtraidas, setFilasExtraidas] = useState([]);
  const [guardarDuplicadosTabla, setGuardarDuplicadosTabla] = useState(false);
  const [fotosTabla, setFotosTabla] = useState([]);
  const [tipoFuenteTabla, setTipoFuenteTabla] = useState("cuaderno_egresos_revisora");
  const [respaldoForm, setRespaldoForm] = useState(RESPALDO_INICIAL);
  const [fotoRespaldo, setFotoRespaldo] = useState(null);
  const [nuevaGestion, setNuevaGestion] = useState({
    gestion: "2019",
    nombre: "Comision revisora gestion 2019",
    observaciones: "",
  });
  const [foto, setFoto] = useState(null);
  const [mensaje, setMensaje] = useState({ texto: "", tipo: "" });
  const [guardando, setGuardando] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [analizandoTabla, setAnalizandoTabla] = useState(false);
  const [verificandoRespaldo, setVerificandoRespaldo] = useState(false);

  const obtenerGestiones = useCallback(async () => {
    const { data, error } = await supabase
      .from("comision_gestiones")
      .select("*")
      .order("gestion", { ascending: false });

    if (error) {
      setMensaje({
        texto: `Falta ejecutar docs/supabase-comision-revisora.sql o revisar permisos: ${error.message}`,
        tipo: "error",
      });
      return;
    }

    setGestiones(data || []);
    setGestionSeleccionada((actual) => actual || data?.[0]?.id || "");
  }, []);

  const obtenerDocumentos = useCallback(async (gestionId) => {
    if (!gestionId) {
      setDocumentos([]);
      return;
    }

    const { data, error } = await supabase
      .from("comision_documentos")
      .select("*")
      .eq("gestion_id", gestionId)
      .order("fecha_documento", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      setMensaje({ texto: `No se pudieron cargar documentos: ${error.message}`, tipo: "error" });
      return;
    }

    setDocumentos(data || []);
  }, []);

  const obtenerRespaldos = useCallback(async (gestionId) => {
    if (!gestionId) {
      setRespaldos([]);
      return;
    }

    const { data, error } = await supabase
      .from("comision_respaldos")
      .select("*")
      .eq("gestion_id", gestionId)
      .order("created_at", { ascending: false });

    if (error) {
      setRespaldos([]);
      return;
    }

    setRespaldos(data || []);
  }, []);

  useEffect(() => {
    obtenerGestiones();
  }, [obtenerGestiones]);

  useEffect(() => {
    obtenerDocumentos(gestionSeleccionada);
    obtenerRespaldos(gestionSeleccionada);
  }, [gestionSeleccionada, obtenerDocumentos, obtenerRespaldos]);

  const resumen = useMemo(() => {
    const ingresos = documentos.reduce((total, doc) => total + numero(doc.monto_ingreso), 0);
    const egresos = documentos.reduce((total, doc) => total + numero(doc.monto_egreso), 0);
    const rendido = documentos.reduce((total, doc) => total + numero(doc.monto_rendido), 0);

    return {
      ingresos,
      egresos,
      rendido,
      saldoCaja: ingresos - egresos,
      documentos: documentos.length,
      respaldos: respaldos.length,
    };
  }, [documentos, respaldos]);

  const anomalias = useMemo(() => detectarAnomalias(documentos), [documentos]);

  const avisosRevisionDocumento = useMemo(() => {
    if (!revisionDocumento) return [];

    const avisos = [];
    const montoTotal = numero(form.monto_ingreso) + numero(form.monto_egreso) + numero(form.monto_rendido);

    if (!form.concepto.trim()) avisos.push("Falta concepto o detalle del documento.");
    if (montoTotal <= 0 && form.tipo_movimiento !== "neutro") {
      avisos.push("Falta monto en ingreso, egreso o rendido.");
    }
    if (!form.numero_recibo.trim() && !form.folio.trim()) {
      avisos.push("No hay numero de recibo ni folio. Usa fecha, concepto y monto como guia.");
    }
    if (revisionDocumento.camposDudosos.length) {
      avisos.push(`Campos dudosos marcados por IA: ${revisionDocumento.camposDudosos.join(", ")}.`);
    }
    if (revisionDocumento.confianzaTexto === "baja") {
      avisos.push("La IA marco confianza baja. Conviene revisar con mas cuidado antes de guardar.");
    }

    return avisos;
  }, [form, revisionDocumento]);

  const correccionesRevisionDocumento = useMemo(() => {
    if (!revisionDocumento) return [];

    return CAMPOS_REVISION_DOCUMENTO.filter((campo) => {
      const original = revisionDocumento.original[campo.key] ?? "";
      const actual = form[campo.key] ?? "";
      return String(original).trim() !== String(actual).trim();
    }).map((campo) => ({
      ...campo,
      original: revisionDocumento.original[campo.key] ?? "",
      actual: form[campo.key] ?? "",
    }));
  }, [form, revisionDocumento]);

  const coincidenciasDocumentoActual = useMemo(
    () => (revisionDocumento ? encontrarCoincidenciasDocumento(form, documentos) : []),
    [documentos, form, revisionDocumento]
  );

  const filasConDuplicados = useMemo(
    () =>
      filasExtraidas.map((fila) => ({
        ...fila,
        coincidencias: encontrarCoincidenciasDocumento(fila, documentos),
      })),
    [documentos, filasExtraidas]
  );

  const filasDuplicadas = useMemo(
    () => filasConDuplicados.filter((fila) => fila.coincidencias.length),
    [filasConDuplicados]
  );

  const filasNuevas = useMemo(
    () => filasConDuplicados.filter((fila) => !fila.coincidencias.length),
    [filasConDuplicados]
  );

  const archivoABase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    });

  const crearGestion = async (e) => {
    e.preventDefault();
    setMensaje({ texto: "", tipo: "" });

    const { data, error } = await supabase
      .from("comision_gestiones")
      .insert([
        {
          gestion: Number(nuevaGestion.gestion),
          nombre: nuevaGestion.nombre,
          observaciones: nuevaGestion.observaciones,
        },
      ])
      .select("*")
      .single();

    if (error) {
      setMensaje({ texto: `No se pudo crear la gestion: ${error.message}`, tipo: "error" });
      return;
    }

    setGestiones((actual) => [data, ...actual]);
    setGestionSeleccionada(data.id);
    setMensaje({ texto: "Gestion de comision revisora creada.", tipo: "exito" });
  };

  const analizarConIA = async () => {
    if (!foto) {
      setMensaje({ texto: "Primero selecciona una foto del documento.", tipo: "advertencia" });
      return;
    }

    setAnalizando(true);
    setMensaje({ texto: "La IA esta leyendo folios, recibos y montos...", tipo: "info" });

    try {
      const base64Data = await archivoABase64(foto);
      const res = await fetch("/api/comision-revisora/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagenBase64: base64Data, mimeType: foto.type }),
      });
      const resultado = await res.json();
      if (resultado.error) throw new Error(resultado.error);

      const confianzaTexto =
        typeof resultado.confianza === "string" ? resultado.confianza.trim().toLowerCase() : "";
      const siguienteForm = {
        ...form,
        fuente: "foto_ia",
        tipo_documento: limpiarDatoIa(resultado.tipo_documento) || form.tipo_documento,
        tipo_movimiento: limpiarDatoIa(resultado.tipo_movimiento) || form.tipo_movimiento,
        fecha_documento: limpiarDatoIa(resultado.fecha_documento) || form.fecha_documento,
        folio: limpiarDatoIa(resultado.folio) || form.folio,
        numero_recibo: limpiarDatoIa(resultado.numero_recibo) || form.numero_recibo,
        persona: limpiarDatoIa(resultado.persona) || form.persona,
        concepto: limpiarDatoIa(resultado.concepto) || form.concepto,
        categoria: limpiarDatoIa(resultado.categoria) || form.categoria,
        rubro: limpiarDatoIa(resultado.rubro) || form.rubro,
        subrubro: limpiarDatoIa(resultado.subrubro) || form.subrubro,
        responsable: limpiarDatoIa(resultado.responsable) || form.responsable,
        destino: limpiarDatoIa(resultado.destino) || form.destino,
        tarea: limpiarDatoIa(resultado.tarea) || form.tarea,
        monto_ingreso: resultado.monto_ingreso ?? form.monto_ingreso,
        monto_egreso: resultado.monto_egreso ?? form.monto_egreso,
        monto_rendido: resultado.monto_rendido ?? form.monto_rendido,
        saldo_libro: resultado.saldo_libro ?? form.saldo_libro,
        cantidad: resultado.cantidad ?? form.cantidad,
        unidad: limpiarDatoIa(resultado.unidad) || form.unidad,
        item: limpiarDatoIa(resultado.item) || form.item,
        contraparte: limpiarDatoIa(resultado.contraparte) || form.contraparte,
        interes_porcentaje: resultado.interes_porcentaje ?? form.interes_porcentaje,
        saldo_a_favor: resultado.saldo_a_favor ?? form.saldo_a_favor,
        saldo_en_contra: resultado.saldo_en_contra ?? form.saldo_en_contra,
        texto_extraido: limpiarDatoIa(resultado.texto_extraido) || form.texto_extraido,
        confianza: confianzaIaANumero(resultado.confianza, resultado.confianza_numerica) ?? form.confianza,
        observaciones: [
          limpiarDatoIa(resultado.observaciones),
          confianzaTexto ? `Confianza IA: ${confianzaTexto}` : "",
          Array.isArray(resultado.campos_dudosos) && resultado.campos_dudosos.length
            ? `Campos dudosos: ${resultado.campos_dudosos.join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join(" | ") || form.observaciones,
      };

      setForm(siguienteForm);
      setRevisionDocumento({
        original: siguienteForm,
        camposDudosos: Array.isArray(resultado.campos_dudosos) ? resultado.campos_dudosos : [],
        confianzaTexto,
        revisado: false,
        coincidencias: encontrarCoincidenciasDocumento(siguienteForm, documentos),
        resultadoBruto: resultado,
      });
      setPermitirDuplicadoDocumento(false);

      setMensaje({ texto: "Documento leido. Corrige y confirma la revision antes de guardar.", tipo: "exito" });
    } catch (error) {
      setMensaje({ texto: `La IA no pudo leer el documento: ${error.message}`, tipo: "error" });
    } finally {
      setAnalizando(false);
    }
  };

  const guardarDocumento = async (e) => {
    e.preventDefault();

    if (!gestionSeleccionada) {
      setMensaje({ texto: "Primero crea o selecciona una gestion.", tipo: "advertencia" });
      return;
    }

    if (revisionDocumento && !revisionDocumento.revisado) {
      setMensaje({
        texto: "Primero confirma la revision de la lectura IA antes de guardar.",
        tipo: "advertencia",
      });
      return;
    }

    if (coincidenciasDocumentoActual.length && !permitirDuplicadoDocumento) {
      setMensaje({
        texto: "Este documento parece ya cargado. Revisa las coincidencias o marca guardar como duplicado justificado.",
        tipo: "advertencia",
      });
      return;
    }

    if (!form.concepto.trim()) {
      setMensaje({ texto: "El concepto es obligatorio.", tipo: "advertencia" });
      return;
    }

    setGuardando(true);
    setMensaje({ texto: "", tipo: "" });

    try {
      let urlImagen = null;
      if (foto) {
        const nombreArchivo = `${gestionSeleccionada}/${Date.now()}_${foto.name.replace(/\s+/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("comision-revisora")
          .upload(nombreArchivo, foto);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("comision-revisora")
          .getPublicUrl(nombreArchivo);
        urlImagen = urlData.publicUrl;
      }

      const payload = {
        gestion_id: gestionSeleccionada,
        tipo_documento: form.tipo_documento,
        tipo_movimiento: form.tipo_movimiento,
        fuente: foto ? form.fuente : "manual",
        fecha_documento: form.fecha_documento || null,
        folio: form.folio.trim() || null,
        numero_recibo: form.numero_recibo.trim() || null,
        persona: form.persona.trim() || null,
        concepto: form.concepto.trim(),
        categoria: form.categoria.trim() || null,
        rubro: form.rubro.trim() || null,
        subrubro: form.subrubro.trim() || null,
        responsable: form.responsable.trim() || null,
        destino: form.destino.trim() || null,
        tarea: form.tarea.trim() || null,
        monto_ingreso: numero(form.monto_ingreso),
        monto_egreso: numero(form.monto_egreso),
        monto_rendido: numero(form.monto_rendido),
        saldo_libro: opcionalNumero(form.saldo_libro),
        cantidad: opcionalNumero(form.cantidad),
        unidad: form.unidad.trim() || null,
        item: form.item.trim() || null,
        contraparte: form.contraparte.trim() || null,
        interes_porcentaje: opcionalNumero(form.interes_porcentaje),
        saldo_a_favor: numero(form.saldo_a_favor),
        saldo_en_contra: numero(form.saldo_en_contra),
        url_imagen: urlImagen,
        texto_extraido: form.texto_extraido.trim() || null,
        confianza: opcionalNumero(form.confianza),
        observaciones: form.observaciones.trim() || null,
      };

      const { error } = await supabase.from("comision_documentos").insert([payload]);
      if (error) throw error;

      setForm(FORM_INICIAL);
      setFoto(null);
      setRevisionDocumento(null);
      setPermitirDuplicadoDocumento(false);
      await obtenerDocumentos(gestionSeleccionada);
      setMensaje({ texto: "Documento registrado para cruce y revision.", tipo: "exito" });
    } catch (error) {
      setMensaje({ texto: `No se pudo guardar: ${error.message}`, tipo: "error" });
    } finally {
      setGuardando(false);
    }
  };

  const analizarTablaManuscrita = async () => {
    if (!fotosTabla.length) {
      setMensaje({ texto: "Selecciona una o varias fotos del cuaderno manuscrito.", tipo: "advertencia" });
      return;
    }

    setAnalizandoTabla(true);
    setMensaje({ texto: "La IA esta extrayendo filas manuscritas para revision...", tipo: "info" });

    try {
      const imagenes = await Promise.all(
        fotosTabla.map(async (file) => ({
          imagenBase64: await archivoABase64(file),
          mimeType: file.type,
        }))
      );

      const res = await fetch("/api/comision-revisora/analizar-tabla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagenes, tipoFuente: tipoFuenteTabla }),
      });
      const resultado = await res.json();
      if (resultado.error) throw new Error(resultado.error);

      setFilasExtraidas(
        (resultado.filas || []).map((fila, index) => ({
          id_temporal: `${Date.now()}-${index}`,
          tipo_documento: fila.tipo_documento || tipoFuenteTabla,
          tipo_movimiento: fila.tipo_movimiento || "egreso",
          fecha_documento: limpiarDatoIa(fila.fecha_documento || fila.fecha),
          folio: limpiarDatoIa(fila.folio || fila.numero_folio),
          numero_recibo: limpiarDatoIa(fila.numero_recibo),
          persona: limpiarDatoIa(fila.responsable || fila.persona),
          concepto: limpiarDatoIa(fila.concepto || fila.detalle),
          rubro: limpiarDatoIa(fila.rubro),
          subrubro: limpiarDatoIa(fila.subrubro),
          responsable: limpiarDatoIa(fila.responsable),
          destino: limpiarDatoIa(fila.destino),
          tarea: limpiarDatoIa(fila.tarea),
          monto_ingreso: fila.monto_ingreso ?? "",
          monto_egreso: fila.monto_egreso ?? fila.monto_bs ?? "",
          observaciones: [
            fila.observaciones,
            fila.dudas,
            fila.confianza && typeof fila.confianza === "string" ? `Confianza IA: ${fila.confianza}` : "",
            Array.isArray(fila.campos_dudosos) && fila.campos_dudosos.length
              ? `Campos dudosos: ${fila.campos_dudosos.join(", ")}`
              : "",
          ]
            .filter(Boolean)
            .join(" | "),
          confianza: confianzaIaANumero(fila.confianza, fila.confianza_numerica) ?? "",
        }))
      );
      setGuardarDuplicadosTabla(false);

      setMensaje({ texto: "Filas extraidas. Revisa la tabla antes de guardar.", tipo: "exito" });
    } catch (error) {
      setMensaje({ texto: `No se pudo extraer la tabla: ${error.message}`, tipo: "error" });
    } finally {
      setAnalizandoTabla(false);
    }
  };

  const actualizarFilaExtraida = (idTemporal, campo, valor) => {
    setFilasExtraidas((actual) =>
      actual.map((fila) => (fila.id_temporal === idTemporal ? { ...fila, [campo]: valor } : fila))
    );
  };

  const guardarFilasExtraidas = async () => {
    if (!gestionSeleccionada) {
      setMensaje({ texto: "Primero selecciona una gestion.", tipo: "advertencia" });
      return;
    }
    if (!filasExtraidas.length) {
      setMensaje({ texto: "No hay filas extraidas para guardar.", tipo: "advertencia" });
      return;
    }

    const filasParaGuardar = guardarDuplicadosTabla ? filasConDuplicados : filasNuevas;
    if (!filasParaGuardar.length) {
      setMensaje({
        texto: "Todas las filas parecen ya cargadas. Puedes volver a analizar, descartar o activar guardar repetidas si corresponde.",
        tipo: "advertencia",
      });
      return;
    }

    setGuardando(true);
    try {
      const { data: lote, error: loteError } = await supabase
        .from("comision_lotes_carga")
        .insert([
          {
            gestion_id: gestionSeleccionada,
            tipo_fuente: tipoFuenteTabla,
            descripcion: guardarDuplicadosTabla
              ? "Carga desde tabla manuscrita revisada con repetidos autorizados"
              : "Carga desde tabla manuscrita revisada; repetidos omitidos",
            cantidad_imagenes: fotosTabla.length,
          },
        ])
        .select("*")
        .single();
      if (loteError) throw loteError;

      const payload = filasParaGuardar.map((fila) => ({
        gestion_id: gestionSeleccionada,
        lote_carga_id: lote.id,
        tipo_documento: fila.tipo_documento || tipoFuenteTabla,
        tipo_movimiento: fila.tipo_movimiento || "egreso",
        fuente: "tabla_manuscrita_ia",
        fecha_documento: fila.fecha_documento || null,
        folio: fila.folio || null,
        numero_recibo: fila.numero_recibo || null,
        persona: fila.persona || null,
        concepto: fila.concepto || "Sin detalle",
        rubro: fila.rubro || null,
        subrubro: fila.subrubro || null,
        responsable: fila.responsable || fila.persona || null,
        destino: fila.destino || null,
        tarea: fila.tarea || null,
        monto_ingreso: numero(fila.monto_ingreso),
        monto_egreso: numero(fila.monto_egreso),
        confianza: opcionalNumero(fila.confianza),
        observaciones: [
          fila.observaciones,
          guardarDuplicadosTabla && fila.coincidencias?.length
            ? "Guardado como repetido justificado por usuario."
            : "",
        ]
          .filter(Boolean)
          .join(" | ") || null,
      }));

      const { error } = await supabase.from("comision_documentos").insert(payload);
      if (error) throw error;

      setFilasExtraidas([]);
      setFotosTabla([]);
      setGuardarDuplicadosTabla(false);
      await obtenerDocumentos(gestionSeleccionada);
      setMensaje({
        texto: guardarDuplicadosTabla
          ? "Filas guardadas, incluyendo repetidas autorizadas."
          : `Filas nuevas guardadas. Repetidas omitidas: ${filasDuplicadas.length}.`,
        tipo: "exito",
      });
    } catch (error) {
      setMensaje({ texto: `No se pudieron guardar las filas: ${error.message}`, tipo: "error" });
    } finally {
      setGuardando(false);
    }
  };

  const verificarRespaldo = async () => {
    if (!fotoRespaldo || !respaldoForm.documento_id) {
      setMensaje({ texto: "Selecciona un movimiento y una foto de respaldo.", tipo: "advertencia" });
      return;
    }

    setVerificandoRespaldo(true);
    setMensaje({ texto: "La IA esta comparando respaldo contra el movimiento...", tipo: "info" });

    try {
      const movimiento = documentos.find((doc) => doc.id === respaldoForm.documento_id);
      const base64Data = await archivoABase64(fotoRespaldo);
      const res = await fetch("/api/comision-revisora/verificar-respaldo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagenBase64: base64Data, mimeType: fotoRespaldo.type, movimiento }),
      });
      const resultado = await res.json();
      if (resultado.error) throw new Error(resultado.error);

      setRespaldoForm((actual) => ({
        ...actual,
        tipo_respaldo: resultado.tipo_respaldo || actual.tipo_respaldo,
        folio: resultado.folio || movimiento?.folio || actual.folio,
        numero_recibo: resultado.numero_recibo || movimiento?.numero_recibo || actual.numero_recibo,
        fecha_respaldo: resultado.fecha_respaldo || actual.fecha_respaldo,
        persona: resultado.persona || actual.persona,
        detalle: resultado.detalle || actual.detalle,
        monto: resultado.monto ?? actual.monto,
        texto_extraido: resultado.texto_extraido || actual.texto_extraido,
        resultado_verificacion: resultado.resultado_verificacion || "requiere_revision",
        diferencias: resultado.diferencias || [],
        confianza: resultado.confianza ?? actual.confianza,
        observaciones: resultado.observaciones || actual.observaciones,
      }));

      setMensaje({ texto: "Respaldo comparado. Revisa el resultado antes de guardar.", tipo: "exito" });
    } catch (error) {
      setMensaje({ texto: `No se pudo verificar el respaldo: ${error.message}`, tipo: "error" });
    } finally {
      setVerificandoRespaldo(false);
    }
  };

  const guardarRespaldo = async () => {
    if (!gestionSeleccionada || !respaldoForm.documento_id || !fotoRespaldo) {
      setMensaje({ texto: "Selecciona gestion, movimiento y archivo de respaldo.", tipo: "advertencia" });
      return;
    }

    setGuardando(true);
    try {
      const nombreArchivo = `${gestionSeleccionada}/respaldos/${Date.now()}_${fotoRespaldo.name.replace(/\s+/g, "_")}`;
      const { error: uploadError } = await supabase.storage
        .from("comision-revisora")
        .upload(nombreArchivo, fotoRespaldo);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("comision-revisora").getPublicUrl(nombreArchivo);
      const { error } = await supabase.from("comision_respaldos").insert([
        {
          gestion_id: gestionSeleccionada,
          documento_id: respaldoForm.documento_id,
          tipo_respaldo: respaldoForm.tipo_respaldo,
          folio: respaldoForm.folio || null,
          numero_recibo: respaldoForm.numero_recibo || null,
          fecha_respaldo: respaldoForm.fecha_respaldo || null,
          persona: respaldoForm.persona || null,
          detalle: respaldoForm.detalle || null,
          monto: opcionalNumero(respaldoForm.monto),
          url_archivo: urlData.publicUrl,
          texto_extraido: respaldoForm.texto_extraido || null,
          resultado_verificacion: respaldoForm.resultado_verificacion,
          diferencias: respaldoForm.diferencias || [],
          confianza: opcionalNumero(respaldoForm.confianza),
          observaciones: respaldoForm.observaciones || null,
        },
      ]);
      if (error) throw error;

      setRespaldoForm(RESPALDO_INICIAL);
      setFotoRespaldo(null);
      await obtenerRespaldos(gestionSeleccionada);
      setMensaje({ texto: "Respaldo guardado y vinculado al movimiento.", tipo: "exito" });
    } catch (error) {
      setMensaje({ texto: `No se pudo guardar el respaldo: ${error.message}`, tipo: "error" });
    } finally {
      setGuardando(false);
    }
  };

  const gestionActual = gestiones.find((item) => item.id === gestionSeleccionada);

  return (
    <main className="min-h-screen bg-slate-50">
      <NavPrincipal />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
              Comision revisora
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Reconstruccion y cruce de gestiones pasadas
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Carga caja, respaldos, prestamos, rendiciones, almacen, alzas y ventas de oro.
              El sistema cruza folios, recibos, montos y cantidades para encontrar descuadres.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={gestionSeleccionada}
              onChange={(e) => setGestionSeleccionada(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Seleccionar gestion</option>
              {gestiones.map((gestion) => (
                <option key={gestion.id} value={gestion.id}>
                  {gestion.gestion} - {gestion.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                descargarCsv(
                  `comision-revisora-${gestionActual?.gestion || "gestion"}.csv`,
                  documentos
                )
              }
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        {mensaje.texto ? (
          <div
            className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
              mensaje.tipo === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : mensaje.tipo === "exito"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {mensaje.texto}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Documentos</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{resumen.documentos}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Ingresos revisados</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{moneda(resumen.ingresos)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Egresos revisados</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{moneda(resumen.egresos)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Saldo caja calculado</p>
            <p className="mt-1 text-2xl font-bold text-indigo-700">{moneda(resumen.saldoCaja)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Respaldos fisicos</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{resumen.respaldos}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <form onSubmit={crearGestion} className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">Crear gestion revisada</h2>
              <div className="mt-4 grid gap-3">
                <input
                  type="number"
                  value={nuevaGestion.gestion}
                  onChange={(e) => setNuevaGestion((g) => ({ ...g, gestion: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Gestion, ej. 2019"
                />
                <input
                  value={nuevaGestion.nombre}
                  onChange={(e) => setNuevaGestion((g) => ({ ...g, nombre: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Nombre de la comision"
                />
                <textarea
                  value={nuevaGestion.observaciones}
                  onChange={(e) =>
                    setNuevaGestion((g) => ({ ...g, observaciones: e.target.value }))
                  }
                  className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Alcance, responsables o notas"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Crear gestion
                </button>
              </div>
            </form>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">Extraer tabla manuscrita</h2>
              <p className="mt-1 text-sm text-slate-500">
                Para cuadernos con columnas variables: fecha, detalle, monto, recibo, folio y observaciones.
              </p>
              <div className="mt-4 grid gap-3">
                <select
                  value={tipoFuenteTabla}
                  onChange={(e) => setTipoFuenteTabla(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="cuaderno_egresos_revisora">Cuaderno de egresos revisora</option>
                  <option value="combustible">Cuaderno combustible / aceites / grasas</option>
                  <option value="explosivos">Cuaderno explosivos</option>
                  <option value="prestamos_intereses">Prestamos e intereses</option>
                  <option value="telefonos_giros">Telefonos y giros</option>
                  <option value="viaticos">Viaticos</option>
                  <option value="servicios_externos">Servicios externos</option>
                  <option value="otro">Otro formato manuscrito</option>
                </select>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFotosTabla(Array.from(e.target.files || []))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={analizarTablaManuscrita}
                  disabled={analizandoTabla}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                >
                  {analizandoTabla ? "Extrayendo..." : "Extraer filas con IA"}
                </button>
              </div>
            </section>

            <form onSubmit={guardarDocumento} className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">Registrar documento fisico</h2>
              <div className="mt-4 grid gap-3">
                <select
                  value={form.tipo_documento}
                  onChange={(e) => setForm((f) => ({ ...f, tipo_documento: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {TIPOS_DOCUMENTO.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={form.tipo_movimiento}
                    onChange={(e) => setForm((f) => ({ ...f, tipo_movimiento: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="egreso">Egreso</option>
                    <option value="ingreso">Ingreso</option>
                    <option value="neutro">Neutro / control</option>
                  </select>
                  <select
                    value={form.rubro}
                    onChange={(e) => setForm((f) => ({ ...f, rubro: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Rubro</option>
                    {RUBROS.map((rubro) => (
                      <option key={rubro} value={rubro}>
                        {rubro}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={form.fecha_documento}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_documento: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={form.folio}
                    onChange={(e) => setForm((f) => ({ ...f, folio: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Folio"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={form.numero_recibo}
                    onChange={(e) => setForm((f) => ({ ...f, numero_recibo: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Nro. recibo"
                  />
                  <input
                    value={form.persona}
                    onChange={(e) => setForm((f) => ({ ...f, persona: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Socio/proveedor"
                  />
                  <input
                    value={form.subrubro}
                    onChange={(e) => setForm((f) => ({ ...f, subrubro: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Subrubro"
                  />
                </div>

                <textarea
                  value={form.concepto}
                  onChange={(e) => setForm((f) => ({ ...f, concepto: e.target.value }))}
                  className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Concepto del documento"
                />

                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    step="0.01"
                    value={form.monto_ingreso}
                    onChange={(e) => setForm((f) => ({ ...f, monto_ingreso: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Ingreso"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={form.monto_egreso}
                    onChange={(e) => setForm((f) => ({ ...f, monto_egreso: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Egreso"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={form.monto_rendido}
                    onChange={(e) => setForm((f) => ({ ...f, monto_rendido: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Rendido"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    step="0.0001"
                    value={form.cantidad}
                    onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Cantidad"
                  />
                  <input
                    value={form.unidad}
                    onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Unidad"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={form.saldo_libro}
                    onChange={(e) => setForm((f) => ({ ...f, saldo_libro: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Saldo libro"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={form.item}
                    onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Item/material"
                  />
                  <input
                    value={form.contraparte}
                    onChange={(e) => setForm((f) => ({ ...f, contraparte: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Comprador/acreedor"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <input
                    value={form.responsable}
                    onChange={(e) => setForm((f) => ({ ...f, responsable: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Responsable"
                  />
                  <input
                    value={form.destino}
                    onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Destino"
                  />
                  <input
                    value={form.tarea}
                    onChange={(e) => setForm((f) => ({ ...f, tarea: e.target.value }))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Tarea"
                  />
                </div>

                <textarea
                  value={form.observaciones}
                  onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                  className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Observaciones o dudas de revision"
                />

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setFoto(e.target.files?.[0] || null);
                    setRevisionDocumento(null);
                    setPermitirDuplicadoDocumento(false);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />

                {revisionDocumento ? (
                  <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-amber-900">
                          Revision de lectura IA
                        </h3>
                        <p className="mt-1 text-sm text-amber-800">
                          Corrige los campos del formulario. Cuando todo este conforme, confirma la revision para
                          habilitar el guardado.
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          revisionDocumento.revisado
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-white text-amber-700"
                        }`}
                      >
                        {revisionDocumento.revisado ? "Revision confirmada" : "Pendiente de confirmar"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {CAMPOS_REVISION_DOCUMENTO.map((campo) => (
                        <div key={campo.key} className="rounded-lg border border-amber-100 bg-white px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {campo.label}
                          </p>
                          <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                            {String(form[campo.key] ?? "").trim() || "Sin dato"}
                          </p>
                        </div>
                      ))}
                    </div>

                    {avisosRevisionDocumento.length ? (
                      <div className="mt-4 rounded-lg border border-amber-300 bg-white px-3 py-2">
                        <p className="text-sm font-bold text-amber-900">Cosas para revisar</p>
                        <ul className="mt-2 space-y-1 text-sm text-amber-800">
                          {avisosRevisionDocumento.map((aviso) => (
                            <li key={aviso}>- {aviso}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700">
                        No hay alertas fuertes. Igual revisa la imagen original antes de confirmar.
                      </p>
                    )}

                    {coincidenciasDocumentoActual.length ? (
                      <div className="mt-4 rounded-lg border border-red-200 bg-white px-3 py-3">
                        <p className="text-sm font-bold text-red-800">Parece que este documento ya fue cargado</p>
                        <div className="mt-2 space-y-2 text-sm text-red-700">
                          {coincidenciasDocumentoActual.map((item) => (
                            <p key={item.doc.id}>
                              {descripcionCoincidencia(item.doc)}. Coincide por: {item.motivos.join(", ")}.
                            </p>
                          ))}
                        </div>
                        <label className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                          <input
                            type="checkbox"
                            checked={permitirDuplicadoDocumento}
                            onChange={(e) => setPermitirDuplicadoDocumento(e.target.checked)}
                          />
                          Guardar como duplicado justificado
                        </label>
                      </div>
                    ) : null}

                    {correccionesRevisionDocumento.length ? (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <p className="text-sm font-bold text-slate-900">Correcciones hechas por ti</p>
                        <div className="mt-2 space-y-2 text-sm text-slate-600">
                          {correccionesRevisionDocumento.map((campo) => (
                            <p key={campo.key}>
                              <span className="font-semibold text-slate-800">{campo.label}:</span>{" "}
                              {String(campo.original).trim() || "Sin dato"} {"->"}{" "}
                              {String(campo.actual).trim() || "Sin dato"}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() =>
                          setRevisionDocumento((actual) =>
                            actual ? { ...actual, revisado: true } : actual
                          )
                        }
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Confirmar revision
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRevisionDocumento(null);
                          setPermitirDuplicadoDocumento(false);
                          setMensaje({
                            texto: "Lectura IA descartada. Puedes ajustar el formulario manualmente.",
                            tipo: "info",
                          });
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Descartar lectura IA
                      </button>
                    </div>
                  </section>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={analizarConIA}
                    disabled={analizando}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                  >
                    {analizando ? "Analizando..." : "Leer con IA"}
                  </button>
                  <button
                    type="submit"
                    disabled={
                      guardando ||
                      (revisionDocumento && !revisionDocumento.revisado) ||
                      (coincidenciasDocumentoActual.length > 0 && !permitirDuplicadoDocumento)
                    }
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {guardando
                      ? "Guardando..."
                      : revisionDocumento && !revisionDocumento.revisado
                        ? "Confirma revision"
                        : coincidenciasDocumentoActual.length > 0 && !permitirDuplicadoDocumento
                          ? "Autoriza duplicado"
                        : "Guardar"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            {filasExtraidas.length > 0 ? (
              <section className="overflow-hidden rounded-lg border border-indigo-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-indigo-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Revision antes de guardar</h2>
                    <p className="text-sm text-slate-500">
                      Corrige las filas extraidas por IA y luego guardalas en la gestion.
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">
                      Nuevas: {filasNuevas.length} | Posibles repetidas: {filasDuplicadas.length}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={guardarFilasExtraidas}
                    disabled={guardando}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {guardarDuplicadosTabla
                      ? `Guardar ${filasConDuplicados.length} filas`
                      : `Guardar ${filasNuevas.length} nuevas`}
                  </button>
                </div>
                {filasDuplicadas.length ? (
                  <div className="border-b border-amber-100 bg-amber-50 px-5 py-4">
                    <p className="text-sm font-bold text-amber-900">
                      El sistema encontro filas que parecen ya cargadas.
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                      Para evitar doble trabajo, por defecto se guardaran solo las filas nuevas.
                    </p>
                    <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
                      <input
                        type="checkbox"
                        checked={guardarDuplicadosTabla}
                        onChange={(e) => setGuardarDuplicadosTabla(e.target.checked)}
                      />
                      Guardar tambien las filas repetidas
                    </label>
                  </div>
                ) : null}
                <div className="overflow-x-auto">
                  <table className="min-w-[1100px] divide-y divide-slate-200 text-sm">
                    <thead className="bg-indigo-50 text-left text-xs uppercase tracking-wide text-indigo-700">
                      <tr>
                        <th className="px-3 py-2">Fecha</th>
                        <th className="px-3 py-2">Detalle</th>
                        <th className="px-3 py-2">Monto</th>
                        <th className="px-3 py-2">Recibo</th>
                        <th className="px-3 py-2">Folio</th>
                        <th className="px-3 py-2">Rubro</th>
                        <th className="px-3 py-2">Subrubro</th>
                        <th className="px-3 py-2">Obs.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filasConDuplicados.map((fila) => (
                        <tr
                          key={fila.id_temporal}
                          className={fila.coincidencias.length ? "bg-red-50/70" : ""}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={fila.fecha_documento}
                              onChange={(e) =>
                                actualizarFilaExtraida(fila.id_temporal, "fecha_documento", e.target.value)
                              }
                              className="w-36 rounded border border-slate-300 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            {fila.coincidencias.length ? (
                              <p className="mb-1 rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                                Ya cargado
                              </p>
                            ) : null}
                            <input
                              value={fila.concepto}
                              onChange={(e) =>
                                actualizarFilaExtraida(fila.id_temporal, "concepto", e.target.value)
                              }
                              className="w-72 rounded border border-slate-300 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={fila.monto_egreso}
                              onChange={(e) =>
                                actualizarFilaExtraida(fila.id_temporal, "monto_egreso", e.target.value)
                              }
                              className="w-28 rounded border border-slate-300 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={fila.numero_recibo}
                              onChange={(e) =>
                                actualizarFilaExtraida(fila.id_temporal, "numero_recibo", e.target.value)
                              }
                              className="w-24 rounded border border-slate-300 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={fila.folio}
                              onChange={(e) =>
                                actualizarFilaExtraida(fila.id_temporal, "folio", e.target.value)
                              }
                              className="w-24 rounded border border-slate-300 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={fila.rubro}
                              onChange={(e) =>
                                actualizarFilaExtraida(fila.id_temporal, "rubro", e.target.value)
                              }
                              className="w-40 rounded border border-slate-300 px-2 py-1"
                            >
                              <option value="">Rubro</option>
                              {RUBROS.map((rubro) => (
                                <option key={rubro} value={rubro}>
                                  {rubro}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={fila.subrubro}
                              onChange={(e) =>
                                actualizarFilaExtraida(fila.id_temporal, "subrubro", e.target.value)
                              }
                              className="w-36 rounded border border-slate-300 px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={fila.observaciones}
                              onChange={(e) =>
                                actualizarFilaExtraida(fila.id_temporal, "observaciones", e.target.value)
                              }
                              className="w-64 rounded border border-slate-300 px-2 py-1"
                            />
                            {fila.coincidencias.length ? (
                              <p className="mt-1 text-xs text-red-700">
                                Coincide con: {descripcionCoincidencia(fila.coincidencias[0].doc)}
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-900">Respaldos fisicos</h2>
              <p className="mt-1 text-sm text-slate-500">
                Vincula recibos, facturas, notas o comprobantes al movimiento y verifica diferencias con IA.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <select
                  value={respaldoForm.documento_id}
                  onChange={(e) =>
                    setRespaldoForm((actual) => ({ ...actual, documento_id: e.target.value }))
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                >
                  <option value="">Seleccionar movimiento</option>
                  {documentos.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.fecha_documento || "s/f"} | Rec. {doc.numero_recibo || "s/n"} | Folio{" "}
                      {doc.folio || "s/f"} | {doc.concepto}
                    </option>
                  ))}
                </select>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFotoRespaldo(e.target.files?.[0] || null)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm md:col-span-2"
                />
                <button
                  type="button"
                  onClick={verificarRespaldo}
                  disabled={verificandoRespaldo}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                >
                  {verificandoRespaldo ? "Verificando..." : "Verificar con IA"}
                </button>
                <button
                  type="button"
                  onClick={guardarRespaldo}
                  disabled={guardando}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  Guardar respaldo
                </button>
              </div>

              {respaldoForm.resultado_verificacion !== "pendiente" ? (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p className="font-semibold text-slate-900">
                    Resultado: {respaldoForm.resultado_verificacion}
                  </p>
                  <p className="mt-1 text-slate-600">
                    Monto respaldo: {respaldoForm.monto ? moneda(respaldoForm.monto) : "sin monto"} |
                    Recibo: {respaldoForm.numero_recibo || "s/n"} | Folio: {respaldoForm.folio || "s/f"}
                  </p>
                  {respaldoForm.observaciones ? (
                    <p className="mt-2 text-slate-700">{respaldoForm.observaciones}</p>
                  ) : null}
                  {respaldoForm.diferencias?.length ? (
                    <ul className="mt-2 list-disc pl-5 text-red-700">
                      {respaldoForm.diferencias.map((dif, index) => (
                        <li key={`${dif.campo}-${index}`}>{dif.detalle || dif.campo}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Anomalias detectadas</h2>
                  <p className="text-sm text-slate-500">
                    Cruces iniciales por recibo, folio, montos y produccion.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                  {anomalias.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {anomalias.length === 0 ? (
                  <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Sin anomalias automaticas con los documentos cargados.
                  </p>
                ) : (
                  anomalias.map((anomalia, index) => (
                    <div
                      key={`${anomalia.tipo}-${index}`}
                      className={`rounded-lg border px-4 py-3 text-sm ${
                        anomalia.severidad === "alta"
                          ? "border-red-200 bg-red-50 text-red-800"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <p className="font-semibold">{anomalia.tipo}</p>
                      <p className="mt-1">{anomalia.descripcion}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">Documentos cargados</h2>
                <p className="text-sm text-slate-500">
                  Base digital reconstruida desde libros, recibos y respaldos fisicos.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Folio / Recibo</th>
                      <th className="px-4 py-3">Rubro</th>
                      <th className="px-4 py-3">Concepto</th>
                      <th className="px-4 py-3">Ingreso</th>
                      <th className="px-4 py-3">Egreso</th>
                      <th className="px-4 py-3">Cantidad</th>
                      <th className="px-4 py-3">Respaldos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documentos.map((doc) => (
                      <tr key={doc.id} className="align-top hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {etiquetaTipo(doc.tipo_documento)}
                          <p className="mt-1 text-xs font-normal text-slate-500">
                            {doc.persona || doc.contraparte || "Sin persona"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{fechaLocal(doc.fecha_documento)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>Folio: {doc.folio || "s/f"}</p>
                          <p>Recibo: {doc.numero_recibo || "s/n"}</p>
                          {!doc.numero_recibo ? (
                            <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
                              Ref: {referenciaAlternativa(doc)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>{doc.rubro || "Sin rubro"}</p>
                          <p className="text-xs text-slate-500">{doc.subrubro || ""}</p>
                        </td>
                        <td className="max-w-sm px-4 py-3 text-slate-700">
                          <p className="font-medium">{doc.concepto}</p>
                          {doc.destino || doc.tarea ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {[doc.destino, doc.tarea].filter(Boolean).join(" | ")}
                            </p>
                          ) : null}
                          {doc.observaciones ? (
                            <p className="mt-1 text-xs text-slate-500">{doc.observaciones}</p>
                          ) : null}
                          {doc.estado_revision ? (
                            <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                              {doc.estado_revision}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-emerald-700">{moneda(doc.monto_ingreso)}</td>
                        <td className="px-4 py-3 text-red-700">{moneda(doc.monto_egreso)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {doc.cantidad ? `${doc.cantidad} ${doc.unidad || ""}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {respaldos.filter((respaldo) => respaldo.documento_id === doc.id).length}
                        </td>
                      </tr>
                    ))}
                    {documentos.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                          Todavia no hay documentos cargados para esta gestion.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
