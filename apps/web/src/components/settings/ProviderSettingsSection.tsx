import type { Settings } from '../../types.ts'
import { Field } from '../ui/Field.tsx'

export function ProviderSettingsSection({
  provider,
  password,
  connection,
  onPasswordChange,
  onProviderChange,
  onTestConnection,
}: {
  provider: Settings['provider']
  password: string
  connection: string | null
  onPasswordChange: (value: string) => void
  onProviderChange: (key: 'baseUrl' | 'username', value: string) => void
  onTestConnection: () => void
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">PROVEEDOR ISP</div>
          <h2>Administrador de facturas</h2>
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={onTestConnection}
        >
          Probar conexión
        </button>
      </div>
      {connection && (
        <div
          className={`notice ${connection.startsWith('Conexión correcta') ? 'notice-success' : 'notice-error'}`}
        >
          {connection}
        </div>
      )}
      <div className="form-grid">
        <Field label="URL de la API">
          <input
            value={provider.baseUrl}
            onChange={(event) =>
              onProviderChange('baseUrl', event.target.value)
            }
          />
        </Field>
        <Field label="Usuario">
          <input
            value={provider.username}
            onChange={(event) =>
              onProviderChange('username', event.target.value)
            }
          />
        </Field>
        <Field label="Contraseña">
          <input
            type="password"
            autoComplete="new-password"
            placeholder={
              provider.passwordSet
                ? 'Guardada · vacío conserva la actual'
                : 'Contraseña del proveedor'
            }
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
          <small>No se vuelve a mostrar después de guardar.</small>
        </Field>
      </div>
    </section>
  )
}
