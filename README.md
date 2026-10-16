# Cobrix · Integración de facturación ISP

Solución del reto técnico: importa clientes y cuotas pendientes desde el administrador de facturas de un ISP, y concilia las facturas de Cobrix con pagos confirmados en ese sistema.

## Requisitos y arranque

- Node.js 24
- pnpm 12.6.0 (versión fijada en `packageManager`)

```bash
pnpm install
pnpm dev
```

El entorno inicia tres procesos independientes: simulador ISP, backend Cobrix y frontend React.

| Aplicación   | URL                              |
| ------------ | -------------------------------- |
| Panel React  | http://127.0.0.1:4300            |
| API Cobrix   | http://127.0.0.1:4320/api        |
| Salud Cobrix | http://127.0.0.1:4320/api/health |
| API ISP      | http://127.0.0.1:4310/api/v1     |
| Swagger ISP  | http://127.0.0.1:4310/docs       |

El comando requerido por el reto sigue disponible después de instalar dependencias:

```bash
npm start
```

Fija por defecto `SANDBOX_TODAY=2026-10-13`. Para detener los servicios, usa `Ctrl+C`; el supervisor envía la señal de cierre a los procesos hijos. `npm start` requiere que pnpm esté instalado y que se hayan instalado las dependencias del workspace.

Credenciales iniciales del sandbox ISP: `cobrix` / `cobrix-sandbox`. Cámbialas en la configuración de Cobrix si cambias el entorno.

## Organización

```text
apps/
  billing-api/   # simulador entregado; API HTTP y su caja de pruebas
  cobrix/        # Fastify, reglas, persistencia y planificador
  web/           # React + Vite; solo consume HTTP
data/
  billing-api.sqlite  # fixture original del reto; no leer desde Cobrix
  cobrix.sqlite       # almacenamiento local generado por Cobrix (ignorado por Git)
docs/
```

`pnpm-workspace.yaml` configura los workspaces y Turbo coordina compilación y tareas. No se creó paquete compartido: los contratos de la API de Cobrix no son importados por dos aplicaciones y las respuestas del ISP se validan como datos externos en el backend.

El simulador y sus datos mantienen su semántica original. Cobrix solo lo consulta por HTTP. La base de Cobrix es independiente, su ruta se configura con `COBRIX_DB_PATH` y las migraciones de Drizzle se guardan en `apps/cobrix/drizzle/`.

El backend usa la arquitectura V2 en `apps/cobrix/src/v2/modules/`: Settings, Dashboard, Clientes, Facturas y Sincronización separan dominio, aplicación, infraestructura y presentación. El frontend conserva sus rutas públicas `/api/*`, atendidas directamente por esos módulos (no hay prefijo local `/api/v2`). Settings se consulta y actualiza en `/api/settings`, y la conexión ISP se prueba en `/api/provider/test`. El `PUT` de Settings recibe la configuración completa; solo la contraseña del proveedor puede omitirse y, si se omite o se envía vacía, se conserva la existente. La respuesta confirma la actualización sin devolver la configuración. V2 comparte la base y el esquema persistente existentes; Settings separa agregado, factoría y objetos de valor, y usa un seed que inicializa solo si no hay configuración. Las operaciones de lectura no insertan valores por defecto.

El frontend está organizado por responsabilidades dentro de `apps/web/src/`: `pages/` contiene una pantalla por archivo, `components/` agrupa piezas reutilizables en `ui/`, `tables/`, `customer/`, `sync/` y `settings/`, `layouts/` contiene la estructura de navegación, `hooks/` los recursos remotos y el estado de configuración, y `lib/` las funciones comunes de API, validación y formato. `App.tsx` conserva únicamente el enrutamiento; los tipos de las respuestas compartidas están en `types.ts`.

El panel presenta el total de facturas pagadas y el estado del planificador; las tablas muestran los datos de corte y pago y el expediente agrega eventos de importación y conciliación. El resumen del proveedor no incluye su URL, usuario ni datos de empresa; los datos de conexión editables se consultan únicamente desde Configuración.

## Operaciones

1. Configura datos de empresa y proveedor en **Configuración**.
2. Usa **Probar conexión** para comprobar autenticación y obtener el número de contratos.
3. Ejecuta primero **Simular**: informa qué cuotas se importarían o conciliarían sin cambiar los datos comerciales de Cobrix.
4. Confirma **Ejecutar** para aplicar la operación real.
5. Consulta el **Historial** para ver el resultado y el motivo por cuota.

La importación identifica cada cuota por el contrato externo y su `deuda_id`, protegidos por una restricción única en SQLite. La conciliación solo cierra una factura si todos los registros relevantes coinciden, el saldo es cero y existe evidencia de pago. Un abono parcial se reporta en el detalle de la corrida y no cierra ni reduce el saldo comercial de la factura; así se conservan los totales de aceptación del reto. Un pago anulado puede reabrir una factura cuando el estado actual del ISP lo demuestra.

## Comandos útiles

```bash
pnpm dev                  # simulador + API Cobrix + Vite
pnpm build                # comprobación de build de los workspaces
pnpm typecheck            # TypeScript estricto
pnpm lint                 # formato Prettier
pnpm test                 # pruebas del simulador, dominio, API y ciclo completo
pnpm coverage             # cobertura V8 del dominio/sincronización
pnpm db:generate          # generar migración nueva
pnpm db:migrate           # aplicar migraciones sin borrar datos
pnpm seed                 # regenerar SOLO el simulador (uso de desarrollo)
```

El comando `pnpm seed` reemplaza el contenido de la base del simulador. No es necesario para el uso normal; las pruebas crean un sandbox temporal y no alteran `data/billing-api.sqlite`.

## Variables de entorno

| Variable                                      | Uso                                                      |
| --------------------------------------------- | -------------------------------------------------------- |
| `HOST`                                        | Interfaz local donde escuchan los servicios              |
| `PORT` / `WEB_PORT`                           | Puerto del frontend (4300 por defecto)                   |
| `COBRIX_PORT`                                 | Puerto del backend Cobrix (4320)                         |
| `BILLING_API_PORT`                            | Puerto del simulador (4310)                              |
| `BILLING_API_DB`                              | Ruta alternativa a la base del simulador                 |
| `COBRIX_DB_PATH`                              | Ruta independiente de la base propia de Cobrix           |
| `ISP_API_URL`, `ISP_USERNAME`, `ISP_PASSWORD` | Valores iniciales del proveedor                          |
| `COBRIX_API_URL`                              | Destino del proxy de Vite al backend                     |
| `WEB_ORIGIN`                                  | Origen adicional permitido por CORS                      |
| `SANDBOX_TODAY`                               | Fecha civil usada por el sandbox; por defecto 2026-10-13 |

Las contraseñas ISP no se devuelven en la API de configuración ni se escriben en logs. En el formulario, una contraseña vacía conserva el valor guardado. SQLite no cifra el archivo; protege su acceso con los permisos del sistema operativo y limita la exposición en HTTP.

## Evaluación del reto

Los criterios de negocio están en [`docs/ENUNCIADO.md`](docs/ENUNCIADO.md), y las formas/particularidades de las respuestas externas en [`docs/API.md`](docs/API.md). Las decisiones técnicas y limitaciones se explican en [`docs/DECISIONES.md`](docs/DECISIONES.md).

Con la fecha del sandbox fijada:

- Simular importación: 42 cuotas y ninguna escritura comercial.
- Primera importación: 20 clientes, 42 facturas abiertas por USD 1.235.
- Repetir importación: cero facturas nuevas.
- Ciclo de pagos/anulación: 8 facturas pagadas, 34 abiertas por USD 955.
