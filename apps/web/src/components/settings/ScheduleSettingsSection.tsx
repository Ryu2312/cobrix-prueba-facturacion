import type { Settings } from '../../types.ts'
import { Field } from '../ui/Field.tsx'

export function ScheduleSettingsSection({
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
          <div className="eyebrow">AUTOMATIZACIÓN</div>
          <h2>Corrida diaria</h2>
        </div>
      </div>
      <div className="form-grid">
        <Field label="Activar corrida automática">
          <label className="check-row">
            <input
              type="checkbox"
              checked={sync.scheduleEnabled}
              onChange={(event) =>
                onChange('scheduleEnabled', event.target.checked)
              }
            />
            Importar y luego actualizar pagadas
          </label>
        </Field>
        <Field label="Hora · America/Caracas">
          <input
            type="time"
            value={sync.scheduleTime}
            onChange={(event) => onChange('scheduleTime', event.target.value)}
          />
        </Field>
      </div>
      <p className="muted">
        El proceso debe estar encendido a la hora programada. No es una cola
        persistente; si el servicio está detenido, no se ejecuta.
      </p>
    </section>
  )
}
