import { NextResponse } from "next/server";
import https from "node:https";

const DELAPAZ_DEUDA_URL = "https://dlpmiddleware.et.bo/iconoinfo/rest/accountspayable/account-consult";
const DELAPAZ_KEY_SERVICE = "wCRJDvFqx3ahNuS28SW9efS9";
export const runtime = "nodejs";

function limpiarCodigo(valor) {
  return String(valor || "").replace(/\D/g, "").slice(0, 12);
}

function esErrorCertificado(error) {
  const codigo = error?.cause?.code || error?.code;
  return [
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    "SELF_SIGNED_CERT_IN_CHAIN",
    "DEPTH_ZERO_SELF_SIGNED_CERT",
  ].includes(codigo);
}

function postJsonDelapaz(body) {
  return new Promise((resolve, reject) => {
    const url = new URL(DELAPAZ_DEUDA_URL);
    const data = JSON.stringify(body);
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        rejectUnauthorized: false,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
        timeout: 20000,
      },
      (res) => {
        let texto = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          texto += chunk;
        });
        res.on("end", () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode || 500,
            text: async () => texto,
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("DELAPAZ no respondio a tiempo."));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

export async function POST(request) {
  try {
    const { codigoConsumidor } = await request.json();
    const consumerCode = limpiarCodigo(codigoConsumidor);

    if (!consumerCode) {
      return NextResponse.json({ error: "Falta el codigo de consumidor DELAPAZ." }, { status: 400 });
    }

    const payload = {
      consumerCode,
      meterNumber: null,
      keyService: DELAPAZ_KEY_SERVICE,
      response: "",
    };

    let respuesta;
    let modoCompatibilidadCertificado = false;
    try {
      respuesta = await fetch(DELAPAZ_DEUDA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch (error) {
      if (!esErrorCertificado(error)) throw error;
      modoCompatibilidadCertificado = true;
      respuesta = await postJsonDelapaz(payload);
    }

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
      modoCompatibilidadCertificado,
    });
  } catch (error) {
    console.error("Error consultando DELAPAZ:", error);
    const codigo = error?.cause?.code || error?.code;
    const mensaje =
      codigo === "ENOTFOUND" || codigo === "ECONNREFUSED"
        ? "No se pudo conectar con el servidor de DELAPAZ. Revisa internet o intenta mas tarde."
        : error.message || "Error consultando DELAPAZ.";
    return NextResponse.json({ error: mensaje, codigo }, { status: 500 });
  }
}
