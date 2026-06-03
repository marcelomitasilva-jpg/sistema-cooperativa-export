const CLAVE_INVITADO = "coop_modo_invitado";

export function activarModoInvitado() {
  if (typeof window !== "undefined") {
    localStorage.setItem(CLAVE_INVITADO, "1");
  }
}

export function desactivarModoInvitado() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CLAVE_INVITADO);
  }
}

export function esModoInvitado() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CLAVE_INVITADO) === "1";
}

export const ETIQUETA_INVITADO = "Invitado (modo desarrollo)";
