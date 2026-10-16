import type { Settings } from '../../types.ts'
import { Field } from '../ui/Field.tsx'

export function CompanySettingsSection({
  company,
  onChange,
}: {
  company: Settings['company']
  onChange: (key: keyof Settings['company'], value: string) => void
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">EMPRESA</div>
          <h2>Datos de cobranza</h2>
        </div>
      </div>
      <div className="form-grid">
        <Field label="Nombre de la empresa">
          <input
            value={company.name}
            onChange={(event) => onChange('name', event.target.value)}
          />
        </Field>
        <Field label="RIF">
          <input
            value={company.taxId}
            onChange={(event) => onChange('taxId', event.target.value)}
          />
        </Field>
        <Field label="Correo de cobranza">
          <input
            type="email"
            value={company.collectionEmail}
            onChange={(event) =>
              onChange('collectionEmail', event.target.value)
            }
          />
        </Field>
      </div>
    </section>
  )
}
