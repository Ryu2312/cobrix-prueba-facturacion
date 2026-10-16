import { startCobrix } from './bootstrap/start-cobrix.ts'

void startCobrix().catch((error: unknown) => {
  console.error(
    `No se pudo iniciar Cobrix: ${error instanceof Error ? error.message : 'error desconocido'}`
  )
  process.exitCode = 1
})
