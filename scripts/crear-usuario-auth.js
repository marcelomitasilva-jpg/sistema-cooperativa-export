/**
 * Crea un usuario de acceso en Supabase Auth para /login.
 *
 * Uso:
 *   node scripts/crear-usuario-auth.js
 *
 * Variables en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=https://...
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 *
 * Variables opcionales:
 *   AUTH_EMAIL=comision@cooperativa.bo
 *   AUTH_PASSWORD=Cooperativa2026!
 */

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function cargarEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;

  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    });
}

cargarEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.AUTH_EMAIL || "comision@cooperativa.com";
const password = process.env.AUTH_PASSWORD || "Cooperativa2026!";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Comprobando si el usuario ya existe...");

  const login = await supabase.auth.signInWithPassword({ email, password });
  if (!login.error) {
    console.log("\nUsuario existente y contrasena correcta.\n");
    console.log("  Correo:    ", email);
    console.log("  Contrasena:", password);
    console.log("\nEntra en: http://localhost:3000/login\n");
    return;
  }

  if (
    login.error.message !== "Invalid login credentials" &&
    !login.error.message.includes("Email not confirmed")
  ) {
    console.error("Error al verificar:", login.error.message);
  }

  console.log("Creando usuario...");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { rol: "comision" } },
  });

  if (error) {
    console.error("\nNo se pudo crear:", error.message);
    console.log(`
Crea el usuario manualmente en Supabase:
  1. https://supabase.com/dashboard -> tu proyecto
  2. Authentication -> Users -> Add user
  3. Email: ${email}
  4. Password: ${password}
  5. Marca "Auto Confirm User"
`);
    process.exit(1);
  }

  if (data.session) {
    console.log("\nUsuario creado y listo para usar.\n");
  } else {
    console.log("\nUsuario creado, pero puede requerir confirmacion de correo.\n");
  }

  console.log("  Correo:    ", email);
  console.log("  Contrasena:", password);
  console.log("\nEntra en: http://localhost:3000/login\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
