# Decisiones técnicas

## Límites del sistema

El workspace `@cobrix/billing-api` es el simulador entregado y queda separado del producto Cobrix. Se trasladaron sus fuentes y se ajustaron las rutas de ejecución; no se cambió el protocolo ni el comportamiento intencionado. Sus operaciones de pago, anulación y reinicio existen para preparar pruebas, no para que la lógica comercial de Cobrix cobre o modifique el ISP. Cobrix consume los endpoints reales de lectura solo mediante HTTP.

## Monorepo y herramientas

pnpm workspaces permite tener aplicaciones con manifiestos y dependencias separadas y un lockfile reproducible. Turbo ejecuta tareas compartidas; los tres servidores de desarrollo son persistentes y se lanzan en paralelo, sin dependencia persistente entre ellos. Que el proceso del ISP se inicie primero no garantiza disponibilidad; las operaciones detectan timeouts y errores HTTP explícitamente.

Se utilizó el scaffold oficial de Vite para React + TypeScript. Se utilizó Fastify CLI para inspeccionar/generar el esqueleto TypeScript; no se añadió `fastify-cli` como dependencia de runtime ni se retuvo autoload porque no hacía falta para esta API pequeña y añadiría plugins no requeridos. Las rutas HTTP se mantienen separadas de los casos de uso y la lógica de dominio.

## Persistencia

Cobrix usa SQLite independiente y Drizzle para tablas, consultas, relaciones por claves foráneas, índices y operaciones CRUD. Drizzle Kit genera migraciones bajo control de versiones; el servidor aplica migraciones al iniciar y no recrea la base de datos. La restricción única compuesta `(external_contract_id, external_installment_id)` es la última defensa contra facturas duplicadas.

Probado en Node v24.21.0 con `drizzle-orm` y `drizzle-kit` `1.0.0-rc.4`: apertura/cierre, migraciones, inserción, lectura, actualización, eliminación, join, agregación y transacciones con commit y rollback. Esas versiones son release candidates, fijadas en los manifiestos y lockfile; conviene reevaluar la compatibilidad al migrar a una versión estable.

`node:sqlite` tiene una API síncrona. Adecuada para el tamaño pequeño del reto y una instancia local, puede bloquear el event loop mientras una consulta tarda; una instalación con carga concurrente significativa debería medirlo y valorar un driver con I/O asíncrono. WAL y `busy_timeout` mejoran la convivencia de lecturas y escrituras, pero la unicidad, las transacciones y el bloqueo del caso de uso son los controles reales de concurrencia.

## Reglas e idempotencia

- La identificación normalizada identifica a una persona titular; los identificadores que no tenían prefijo permanecen sin prefijo (por ejemplo `09000123` → `9000123`).
- El cliente HTTP del ISP aplica timeout, autentica con token temporal y valida la forma esencial de las respuestas sin confiar en `success` cuando el contrato documentado dice que es inconsistente.
- Las respuestas contradictorias no se resuelven por heurística: se registran como conflicto/error y la corrida no se marca como exitosa.
- Los pagos parciales aparecen como resultado de corrida, pero la factura conserva el saldo comercial que tenía antes del abono. Esto mantiene el saldo esperado por los criterios del reto; al confirmarse el pago completo se pone a cero. Una anulación con saldo actual positivo puede reabrirla.
- Simular y ejecutar usan los mismos fetches y clasificadores. La simulación solo crea historial y detalle de corrida, no clientes, contratos ni facturas.
- El coordinador impide solapamientos dentro del proceso; la unicidad en SQLite evita duplicados aunque la importación se repita.

## API, frontend y scheduler

Fastify usa JSON Schema como validación de solicitudes y tipos de `@fastify/type-provider-json-schema-to-ts`. CORS permite solo los orígenes locales del panel y un origen adicional configurado. El React/Vite generado con CLI consume la API por un proxy local; no importa infraestructura de backend ni accede a SQLite.

`node-cron` corre diariamente con la zona `America/Caracas`, usando los mismos casos de uso manuales. El scheduler no es una cola durable: si el proceso está detenido a la hora prevista, no ejecuta una corrida atrasada. Si importación falla, queda una corrida fallida; la conciliación automática solo se lanza después de una importación completada.

## Migración modular incremental del backend

Settings es la referencia arquitectónica: cada módulo se organiza en `domain/`, `application/`, `infrastructure/` y `presentation/`; los casos de uso dependen de puertos, la infraestructura implementa SQLite/HTTP, y los DTO y schemas mantienen los límites externos. Settings usa clases y factoría para validar y coordinar sus invariantes, un mapper explícito entre dominio y persistencia y un seed idempotente. Nombre, RIF y correo de empresa pueden permanecer ausentes; el `PUT /api/settings` recibe la configuración completa, permite omitir la contraseña para conservar la existente y responde con una confirmación. La prueba de conexión devuelve el conteo desde el caso de uso y la ruta compone la respuesta HTTP. Todas las capacidades comparten las tablas existentes, no un segundo almacén. La versión arquitectónica interna no cambia el prefijo público de rutas: el frontend sigue usando `/api/*`, ahora servido directamente por las implementaciones V2.

Dashboard, Clientes y Facturas están migrados como módulos de lectura con puertos, casos de uso, adaptadores SQLite y DTO/rutas; no se añadieron entidades artificiales para proyecciones sin invariantes. Se preservan `/api/summary`, `/api/customers` (incluido `q` y 404), y `/api/invoices` (incluido `status` y orden descendente); las filas Drizzle se interpretan en infraestructura y no se filtran a la API.

Sincronización está migrada en `v2/modules/synchronization/`: importación, conciliación, historial de corridas, coordinación, rutas y scheduler. Se conservan normalización, elegibilidad, límites, simulación, idempotencia, transacciones, clasificación de pagos y reglas de reapertura. Los endpoints manuales permanecen en `/api/sync/import` y `/api/sync/reconcile`; historial en `/api/runs`. El dominio de sincronización se encuentra bajo el módulo; el cliente HTTP ISP y los errores compartidos están en `v2/modules/shared/`. `api/server.ts` queda como composición de dependencias y manejo transversal HTTP. Las rutas públicas de Settings (`/api/settings`, `/api/provider/test`) son atendidas directamente por sus rutas V2; se eliminó el adaptador de compatibilidad y no hay una implementación local V1 en paralelo.

Las respuestas de corrida se proyectan a DTO en presentación. La API mantiene validación JSON Schema y traducción explícita de errores de validación, conflicto, proveedor y dominio. Las pruebas de API y aceptación verifican que los contratos externos y comportamientos relevantes sobrevivan a la reorganización.

La revisión encontró que V1 estaba organizada por capas técnicas: concentraba consultas de varios dominios y mezclaba persistencia, coordinación y llamadas al ISP. Esa implementación se reemplazó progresivamente por módulos de negocio sin modificar las reglas cubiertas por aceptación. TypeScript estricto, transacciones, unicidad/idempotencia, clasificación de pagos y pruebas de ciclo completo siguen siendo controles esenciales.

## Límites conocidos / siguientes pasos

- El alcance no incluye usuarios locales, roles ni cifrado de secretos en reposo. La contraseña del ISP debe poder recuperarse para autenticarse; el archivo SQLite y el host deben tener permisos apropiados.
- Las rutas no tienen autenticación/autorización. El backend se enlaza a `127.0.0.1` por defecto, pero una exposición de red (`HOST` distinto) permitiría consultar datos personales y cambiar configuración; antes de desplegar fuera del entorno local se debe añadir control de acceso y protección de secretos.
- La configuración del ISP acepta una URL absoluta HTTP o HTTPS; si una instancia expuesta permite cambiarla sin autenticación, la prueba de conexión/sincronización puede convertir el backend en un proxy hacia destinos internos. Restringir destinos permitidos es un requisito adicional para despliegues no locales.
- La ejecución automática es local y de una sola instancia; no sustituye un sistema de colas distribuido.
- El reporte de cobertura se enfoca en reglas de dominio y sincronización, no persigue un porcentaje arbitrario.
- Antes de producción se añadirían autenticación del panel, cifrado/gestión de secretos, monitorización, paginación, límites operativos configurables con métricas y un despliegue multi-instancia.
