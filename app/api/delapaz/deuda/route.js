import { NextResponse } from "next/server";

const DELAPAZ_DEUDA_URL = "https://dlpmiddleware.et.bo/iconoinfo/rest/accountspayable/account-consult";
const DELAPAZ_KEY_SERVICE = "wCRJDvFqx3ahNuS28SW9efS9";

function limpiarCodigo(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 12);
}

export async function POST(request) {
  try {
    const { codigoConsumidor } = await request.json();
    const consumerCode = limpiarCodigo(codigoConsumidor);

    if (!consumerCode) {
      return NextResponse.json({ error: "Falta el codigo de consumidor DELAPAZ." }, { status: 400 });
    }

    const respuesta = await fetch(DELAPAZ_DEUDA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consumerCode,
        meterNumber: null,
        keyService: DELAPAZ_KEY_SERVICE,
        response: "",
      }),
      cache: "no-store",
    });

    const texto = await respuesta.text();
    let data = null;
    try {
      data = JSON.parse(texto);
    } catch {
      return NextResponse.json({ error: "DELAPAZ respondio en un formato no esperado." }, { status: 502 });
    }

    if (!respuesta.ok) {
      return NextResponse.json(
        { error: data?.message || "No se pudo consultar DELAPAZ.", detalle: data },
        { status: respuesta.status }
      );
    }

    return NextResponse.json({
      result: data.result,
      message: data.message,
      totalAccount: data.totalAccount,
      consumerCode: data.consumerCode,
      dav: data.dav,
      consumerName: data.consumerName,
      charge: data.charge,
      collectionMessage: data.collectionMessage,
      minimumPaymentAmount: data.minimumPaymentAmount,
      accountDetail: data.accountDetail || [],
      accountPayments: data.accountPayments || [],
    });
  } catch (error) {
    console.error("Error consultando DELAPAZ:", error);
    return NextResponse.json({ error: error.message || "Error consultando DELAPAZ." }, { status: 500 });
  }
}
