import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env = {
  ...process.env,
  SANDBOX_TODAY: process.env.SANDBOX_TODAY ?? '2026-10-13',
}

const services = [
  {
    name: 'simulador ISP',
    cwd: resolve(root, 'apps/billing-api'),
    args: [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      'src/main.ts',
    ],
  },
  {
    name: 'API Cobrix',
    cwd: resolve(root, 'apps/cobrix'),
    args: [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      'src/main.ts',
    ],
  },
  {
    name: 'panel web',
    cwd: resolve(root, 'apps/web'),
    args: ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'],
  },
]

const children = new Set()
let stopping = false
let failure = false

function stop(signal) {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal)
  }
  if (children.size === 0) process.exitCode = failure ? 1 : 0
}

for (const service of services) {
  const child = spawn(process.execPath, service.args, {
    cwd: service.cwd,
    env,
    stdio: 'inherit',
    windowsHide: true,
  })
  children.add(child)
  child.once('error', (error) => {
    console.error(`No se pudo iniciar ${service.name}: ${error.message}`)
    failure = true
    stop('SIGTERM')
  })
  child.once('close', (code, signal) => {
    children.delete(child)
    if (!stopping) {
      console.error(
        `${service.name} terminó inesperadamente (${signal ?? `código ${code ?? 'desconocido'}`}).`
      )
      failure = true
      stop('SIGTERM')
    }
    if (children.size === 0 && stopping) process.exitCode = failure ? 1 : 0
  })
}

process.once('SIGINT', () => stop('SIGINT'))
process.once('SIGTERM', () => stop('SIGTERM'))
