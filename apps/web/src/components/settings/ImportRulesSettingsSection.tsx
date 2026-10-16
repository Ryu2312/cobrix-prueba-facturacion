import type { Settings } from '../../types.ts'
import { Field } from '../ui/Field.tsx'

export function ImportRulesSettingsSection({
  sync,
  onChange,
}: {
  sync: Settings['sync']
  onChange: <K extends keyof Settings['sync']>(
    key: K,
    value: Settings['sync'][K]
  ) => void
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">REGLAS DE IMPORTACIÓN</div>
          <h2>Alcance de las corridas</h2>
        </div>
      </div>
      <div className="form-grid">
        <Field label="Estados de contrato">
          <div className="check-row">
            {['ACTIVO', 'CORTADO'].map((status) => (
              <label key={status}>
                <input
                  type="checkbox"
                  checked={sync.statuses.includes(status)}
                  onChange={(event) =>
                    onChange(
                      'statuses',
                      event.target.checked
                        ? [...sync.statuses, status]
                        : sync.statuses.filter((value) => value !== status)
                    )
                  }
                />
                {status}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Ventana de importación">
          <select
            value={sync.importWindowMonths ?? ''}
            onChange={(event) =>
              onChange(
                'importWindowMonths',
                event.target.value ? Number(event.target.value) : null
              )
            }
          >
            <option value="">Sin límite</option>
            {[3, 6, 9, 12].map((month) => (
              <option key={month} value={month}>
                {month} meses
              </option>
            ))}
          </select>
        </Field>
        <Field label="Máximo de cuotas recientes">
          <input
            type="number"
            min="1"
            max="60"
            value={sync.maxInstallmentsPerContract ?? ''}
            onChange={(event) =>
              onChange(
                'maxInstallmentsPerContract',
                event.target.value ? Number(event.target.value) : null
              )
            }
          />
        </Field>
        <Field label="Días de gracia">
          <input
            type="number"
            min="0"
            max="60"
            value={sync.graceDays}
            onChange={(event) =>
              onChange('graceDays', Number(event.target.value))
            }
          />
        </Field>
        <Field label="Tope de facturas nuevas">
          <input
            type="number"
            min="1"
            value={sync.maxNewInvoices ?? ''}
            onChange={(event) =>
              onChange(
                'maxNewInvoices',
                event.target.value ? Number(event.target.value) : null
              )
            }
          />
        </Field>
        <Field label="Tope de importe nuevo (USD)">
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={sync.maxNewAmount ?? ''}
            onChange={(event) =>
              onChange(
                'maxNewAmount',
                event.target.value ? Number(event.target.value) : null
              )
            }
          />
        </Field>
        <Field label="Excluir documentos">
          <div className="check-row">
            {['V', 'E', 'J', 'G', 'P'].map((type) => (
              <label key={type}>
                <input
                  type="checkbox"
                  checked={sync.excludedDocumentTypes.includes(type)}
                  onChange={(event) =>
                    onChange(
                      'excludedDocumentTypes',
                      event.target.checked
                        ? [...sync.excludedDocumentTypes, type]
                        : sync.excludedDocumentTypes.filter(
                            (value) => value !== type
                          )
                    )
                  }
                />
                {type}
              </label>
            ))}
          </div>
        </Field>
      </div>
    </section>
  )
}
