# Contexto y Objetivo del Sistema

## Nombre del sistema

**MetriWinay**

## Contexto

MetriWinay es una aplicacion web orientada a la gestion, analisis y optimizacion de redes sociales desde un panel centralizado. El sistema nace como una plataforma similar a Metricool, pensada para que una marca, negocio, creador o equipo de marketing pueda conectar sus cuentas sociales, consultar metricas, programar publicaciones y tomar decisiones basadas en datos.

Actualmente el sistema esta enfocado en la integracion con Meta, permitiendo conectar paginas de Facebook e Instagram Business mediante OAuth2. La autenticacion de usuarios, la base de datos y el modelo multi-tenant se gestionan con Supabase.

En el avance actual ya se comprobo la conexion real con Meta, el descubrimiento de paginas administradas y la lectura de metricas publicitarias mediante Marketing API / Ads Insights. Tambien se identifico que algunas metricas organicas de pagina e Instagram dependen de permisos especificos, revision de Meta y disponibilidad de metricas validas en la version actual de Graph API.

El flujo principal del sistema es:

```txt
Registro -> Conexion de cuentas -> Dashboard unificado
-> Creacion/programacion de posts -> Publicacion automatica
-> Recopilacion de metricas -> Analisis y reportes -> Optimizacion
```

## Problema que resuelve

La gestion de redes sociales suele requerir entrar a distintas plataformas, revisar metricas por separado, publicar manualmente y consolidar reportes en hojas externas. Esto genera perdida de tiempo, baja visibilidad del rendimiento real y poca capacidad para optimizar contenido con datos.

MetriWinay busca resolver ese problema centralizando:

- La conexion segura de cuentas sociales.
- La lectura de metricas organicas y publicitarias.
- La programacion de publicaciones.
- La visualizacion de rendimiento en un dashboard unico.
- La preparacion de reportes para analisis y toma de decisiones.

## Objetivo general

Construir una plataforma web moderna, segura y escalable para gestionar redes sociales desde un unico lugar, permitiendo conectar cuentas, analizar estadisticas, programar contenido y optimizar la estrategia digital de una organizacion.

## Objetivos especificos

- Permitir el registro e inicio de sesion de usuarios mediante Supabase Auth.
- Crear automaticamente un workspace u organizacion para cada usuario.
- Conectar cuentas de Meta mediante OAuth2.
- Almacenar tokens de acceso de forma cifrada usando AES-256-GCM.
- Guardar paginas de Facebook e Instagram Business conectadas.
- Sincronizar metricas sociales desde Meta Graph API.
- Sincronizar metricas publicitarias desde Meta Marketing API.
- Mostrar indicadores clave como alcance, engagement, seguidores y publicaciones activas.
- Permitir la creacion y programacion de posts.
- Preparar la arquitectura para publicacion automatica y workers programados.
- Separar la logica de negocio, UI, servicios externos y acceso a datos siguiendo buenas practicas actuales.

## Alcance actual

El sistema actualmente incluye:

- Autenticacion con Supabase.
- Creacion automatica de organizacion.
- Dashboard protegido por sesion.
- Conexion con Meta mediante OAuth2.
- Descubrimiento de paginas conectadas.
- Almacenamiento cifrado de tokens.
- Sincronizacion manual de metricas.
- Lectura de cuentas publicitarias de Meta mediante permisos de Marketing API.
- Persistencia de snapshots publicitarios en `ad_metric_snapshots`.
- Integracion de metricas publicitarias al dashboard principal.
- Programacion basica de publicaciones(sin probarse).
- Secciones navegables: Dashboard, Publicaciones, Analiticas, Reportes, Inbox, Conexiones y Ajustes.
- Esquema de base de datos con Row Level Security para proteger datos por organizacion lugar:supabase\migrations.
- Script local de diagnostico `npm.cmd run meta:debug` para validar permisos y endpoints de Meta sin guardar tokens en el repositorio.

## Estado actual de integracion con Meta

La integracion con Meta tiene dos capas principales:

- **Conexion de paginas:** permite listar paginas administradas mediante `pages_show_list` y `pages_read_engagement`.
- **Metricas de anuncios:** permite consultar cuentas publicitarias e insights mediante `ads_read`, `ads_management` y `business_management`.

Durante las pruebas se valido correctamente:

- Lectura del usuario autenticado en Graph API.
- Lectura de permisos concedidos.
- Lectura de paginas administradas.
- Presencia de page access tokens.
- Lectura de cuentas publicitarias.
- Lectura de Ads Insights con datos reales.

Ejemplo de metricas disponibles desde Ads Insights(deseable):

- Impresiones.
- Alcance.
- Gasto.
- Clicks.
- CTR.
- CPC.
- CPM.
- Acciones, como engagement de pagina, engagement de post, reproducciones de video, guardados y reacciones.

## Limitaciones actuales detectadas

Durante las pruebas con Graph API se detecto que algunas metricas organicas historicas, como `page_impressions`, pueden devolver error de metrica invalida segun la version de API, el tipo de pagina, los permisos concedidos o los cambios recientes en la plataforma de Meta.

Por ese motivo, el sistema actualmente prioriza datos confiables desde Ads Insights cuando existen permisos publicitarios. Las metricas organicas de pagina e Instagram quedan preparadas para ampliarse con permisos adicionales como:

- `read_insights`.
- `instagram_basic`.
- `instagram_manage_insights`.

Estas capacidades pueden requerir configuracion adicional en Meta Developers y, para produccion, revision y aprobacion de permisos.

## Alcance futuro

En siguientes etapas, el sistema puede ampliarse con:

- Publicacion automatica real en Facebook e Instagram.
- Calendario visual de publicaciones.
- Reportes exportables en PDF, Excel o CSV.
- Webhooks de Meta para eventos en tiempo real.
- Workers recurrentes para refrescar tokens y recopilar metricas.
- Normalizacion avanzada entre metricas organicas y metricas pagadas.
- Soporte completo para insights de Instagram Business.
- Sincronizacion historica por rangos de fecha.
- Soporte para mas redes sociales como TikTok, LinkedIn, YouTube o X.
- Gestion de equipos, roles y permisos avanzados.
- Bandeja de comentarios y mensajes.
- Recomendaciones de optimizacion basadas en rendimiento historico.

## Usuarios objetivo

MetriWinay esta pensado para:

- Emprendedores y marcas pequenas.
- Equipos de marketing.
- Community managers.
- Agencias digitales.
- Creadores de contenido.
- Negocios que necesitan medir y organizar su presencia en redes sociales.

## Arquitectura general

El sistema esta construido con una arquitectura modular:

- **Frontend:** Next.js con App Router, React y Tailwind CSS.
- **Backend:** Route Handlers de Next.js para OAuth, sincronizacion, programacion y workers.
- **Base de datos:** Supabase Postgres.
- **Autenticacion:** Supabase Auth.
- **Seguridad:** Row Level Security, service role para procesos internos y cifrado AES-256-GCM para tokens.
- **Integraciones:** Meta Graph API y Meta Marketing API.
- **Dominio:** Modulos separados para redes sociales, analiticas, scheduling, workspace y autenticacion.

## Modelo de seguridad

La seguridad del sistema se basa en:

- Autenticacion obligatoria para acceder al dashboard.
- Separacion de datos por organizacion.
- Politicas RLS en Supabase.
- Tokens OAuth cifrados antes de guardarse en base de datos.
- Uso de service role solo en operaciones internas del servidor.
- Variables sensibles almacenadas en `.env.local`, no en archivos versionables.
- Endpoints cron protegidos con `CRON_SECRET`.
- Diagnostico de tokens mediante variables temporales de entorno, no mediante archivos permanentes.

## Flujo OAuth con Meta

El flujo de conexion con Meta funciona asi:

1. El usuario inicia sesion en MetriWinay.
2. Presiona `Conectar Meta`.
3. El sistema genera un `state` con usuario, organizacion y proveedor.
4. El usuario es redirigido a Meta para autorizar la app.
5. Meta devuelve un `code` al callback configurado.
6. El backend intercambia el `code` por un token.
7. El token se convierte en long-lived token cuando aplica.
8. El token se cifra antes de persistirse.
9. El sistema consulta las paginas/cuentas disponibles.
10. Las cuentas se guardan asociadas a la organizacion.
11. Se ejecuta una primera sincronizacion de metricas.
12. Si el usuario tiene permisos de Marketing API, se consultan cuentas publicitarias y Ads Insights.

## Flujo de sincronizacion de metricas

El flujo actual de sincronizacion es:

1. El usuario conecta Meta o pulsa `Sincronizar`.
2. El backend busca las cuentas Meta activas asociadas a la organizacion.
3. El sistema intenta leer metricas organicas disponibles.
4. El sistema consulta cuentas publicitarias con Marketing API.
5. Por cada cuenta publicitaria, consulta Ads Insights.
6. Los datos publicitarios se guardan en `ad_metric_snapshots`.
7. Los indicadores principales se reflejan en el dashboard.

Este flujo permite mostrar datos reales incluso cuando las metricas organicas de pagina no estan disponibles por restricciones de API o permisos.

## Indicadores principales

El dashboard considera como metricas principales:

- Alcance.
- Engagement.
- Seguidores.
- Publicaciones activas o programadas.
- Rendimiento semanal.
- Cuentas conectadas.
- Cola de publicaciones.
- Impresiones publicitarias.
- Gasto publicitario.
- Clicks.
- CTR.
- CPC.
- CPM.

## Criterios de exito

El sistema se considera exitoso si permite que un usuario:

- Se registre e ingrese correctamente.
- Conecte una cuenta de Meta.
- Visualice sus cuentas conectadas.
- Sincronice metricas disponibles.
- Consulte metricas publicitarias reales desde Meta Ads.
- Programe una publicacion.
- Navegue entre secciones del panel.
- Mantenga sus datos protegidos por organizacion.

## Vision del producto

MetriWinay busca convertirse en una herramienta de inteligencia social para negocios y creadores, combinando gestion operativa de publicaciones con analisis claro de rendimiento. La meta es que el usuario no solo publique contenido, sino que entienda que funciona, que debe mejorar y como puede optimizar su presencia digital.
