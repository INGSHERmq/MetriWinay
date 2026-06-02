# MetriWinay

Aplicacion web tipo Metricool para conectar redes sociales, programar publicaciones, recopilar metricas y generar reportes usando Supabase como base de datos.

## Stack

- Next.js App Router + TypeScript
- Supabase Auth/Postgres/RLS
- Tailwind CSS
- API routes para OAuth2, webhooks, workers cron y programacion
- Servicios por dominio en `src/modules`

## Estructura

```txt
src/
  app/                 Rutas UI y API
  components/          Componentes reutilizables
  lib/                 Clientes, utilidades y configuracion base
  modules/             Logica de dominio: social, analytics, scheduling
supabase/
  migrations/          Esquema SQL versionado
```

## Flujo principal

Registro -> OAuth2 de cuentas -> Dashboard unificado -> Creacion/programacion de posts -> Publicacion automatica -> Recopilacion de metricas -> Reportes -> Optimizacion.

## Puesta en marcha

1. Copia `.env.example` a `.env.local` y coloca credenciales reales solo ahi.
2. Genera `TOKEN_ENCRYPTION_KEY_BASE64` con `npm.cmd run crypto:key`.
3. Configura Supabase y ejecuta las migraciones en orden:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_social_account_credentials.sql`
4. Verifica variables con `npm.cmd run env:check`.
5. Instala dependencias con  `npm.cmd install`.
6. Ejecuta `npm.cmd run dev`.

## Prueba rapida

1. Abre `http://localhost:3000/login`.
2. Crea un usuario.
3. Entra al dashboard y pulsa `Conectar Meta`.
4. Autoriza tu app de Meta.
5. Al volver, el dashboard debe listar paginas de Facebook e Instagram Business conectadas.
6. Selecciona una cuenta en el composer y guarda una publicacion programada.

Por defecto `META_OAUTH_SCOPE_MODE=basic` pide permisos de lectura para Pages, insights y Ads (`ads_read`) para que Analiticas pueda concordar con Meta Ads Manager. Cambia a `publishing` cuando tu app de Meta tenga configurados/aprobados los permisos avanzados de publicacion e Instagram.

## Debug de permisos Meta

No guardes access tokens en el repositorio. Para probar un token temporal de Graph API Explorer:

```powershell
$env:META_DEBUG_ACCESS_TOKEN="TOKEN_TEMPORAL"
npm.cmd run meta:debug
Remove-Item Env:\META_DEBUG_ACCESS_TOKEN
```

El script oculta tokens de paginas y muestra permisos, paginas, insights disponibles y cuentas publicitarias.

## Seguridad

- Los tokens OAuth se guardan cifrados con AES-256-GCM antes de persistirlos.
- RLS queda activado para datos multi-tenant.
- Los cron endpoints requieren `CRON_SECRET`.
- Los refresh tokens se renuevan antes de expirar y la cuenta pasa a `TOKEN_EXPIRED` tras tres fallos.
