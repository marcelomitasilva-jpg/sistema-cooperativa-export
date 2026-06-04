# Guardado en la nube

El codigo del proyecto se guarda en GitHub:

`https://github.com/marcelomitasilva-jpg/sistema-cooperativa-export`

La base de datos se guarda en Supabase.

## Regla de trabajo

- Cambios de codigo, pantallas, scripts y SQL: subir a GitHub.
- Datos reales de la cooperativa: guardar en Supabase.
- Fotos, CSV, JSON de extraccion y respaldos fisicos: no subir a GitHub.

## Guardar cambios desde VS Code

Desde la terminal del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\sync-to-github.ps1 -Message "Descripcion del cambio"
```

Si no escribes mensaje, el script usa uno automatico con fecha y hora.
