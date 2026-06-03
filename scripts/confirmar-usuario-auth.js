/**
 * Confirma un usuario en Supabase Auth sin esperar correo.
 *
 * Uso:
 *   node scripts/confirmar-usuario-auth.js
 *
 * Variables en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=https://...
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * Variables opcionales:
 *   AUTH_EMAIL=comision@cooperativa.com
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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.AUTH_EMAIL || "comision@cooperativa.com";

if (!supabaseUrl || !serviceKey) {
  console.error(`
Faltan variables de Supabase en .env.local

Agrega:
  NEXT_PUBLIC_SUPABASE_URL=https://...
  SUPABASE_SERVICE_ROLE_KEY=eyJ...

Luego ejecuta de nuevo:
  node scripts/confirmar-usuario-auth.js
`);
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Buscando usuario: ${email}`);

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error("Error al listar usuarios:", error.message);
    process.exit(1);
  }

  const usuario = data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (!usuario) {
    console.error(`No existe el usuario ${email}.`);
    console.log("Crealo con: node scripts/crear-usuario-auth.js");
    process.exit(1);
  }

  if (usuario.email_confirmed_at) {
    console.log("\nEl usuario ya estaba confirmado. Puede iniciar sesion.\n");
    return;
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    usuario.id,
    { email_confirm: true }
  );

  if (updateError) {
    console.error("Error al confirmar:", updateError.message);
    process.exit(1);
  }

  console.log("\nUsuario confirmado correctamente.\n");
  console.log("  Correo: ", email);
  console.log("\nEntra en: http://localhost:3000/login\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
