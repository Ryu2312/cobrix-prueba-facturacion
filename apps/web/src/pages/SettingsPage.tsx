import { useResource } from '../hooks/useResource.ts'
import { useSettingsForm } from '../hooks/useSettingsForm.ts'
import { CompanySettingsSection } from '../components/settings/CompanySettingsSection.tsx'
import { ImportRulesSettingsSection } from '../components/settings/ImportRulesSettingsSection.tsx'
import { ProviderSettingsSection } from '../components/settings/ProviderSettingsSection.tsx'
import { ScheduleSettingsSection } from '../components/settings/ScheduleSettingsSection.tsx'
import { Notice } from '../components/ui/Notice.tsx'
import { PageHeading } from '../components/PageHeading.tsx'
import type { Settings } from '../types.ts'

const DESCRIPTION = 'Datos de empresa, proveedor y reglas de sincronización.'

export function SettingsPage() {
  const { data, loading, error, refresh } =
    useResource<Settings>('/api/settings')
  const form = useSettingsForm(data, refresh)

  if (loading || error || !form.draft) {
    return (
      <>
        <PageHeading
          eyebrow="SISTEMA"
          title="Configuración"
          description={DESCRIPTION}
        />
        <Notice
          loading={loading}
          error={
            error ?? (loading ? null : 'No se pudo cargar la configuración.')
          }
          retry={refresh}
        />
      </>
    )
  }

  return (
    <>
      <PageHeading
        eyebrow="SISTEMA"
        title="Configuración"
        description="Conexión al proveedor y reglas comerciales de importación."
      />
      {form.message && (
        <div className="notice notice-success">{form.message}</div>
      )}
      {form.failure && (
        <div className="notice notice-error">{form.failure}</div>
      )}
      <form
        onSubmit={(event) => void form.save(event)}
        className="settings-form"
      >
        <CompanySettingsSection
          company={form.draft.company}
          onChange={form.updateCompany}
        />
        <ProviderSettingsSection
          provider={form.draft.provider}
          password={form.password}
          connection={form.connection}
          onPasswordChange={form.setPassword}
          onProviderChange={form.updateProvider}
          onTestConnection={() => void form.testConnection()}
        />
        <ImportRulesSettingsSection
          sync={form.draft.sync}
          onChange={form.updateSync}
        />
        <ScheduleSettingsSection
          sync={form.draft.sync}
          onChange={form.updateSync}
        />
        <div className="form-footer">
          <span className="muted">
            La contraseña se guarda en la base local de Cobrix y no se devuelve
            al navegador al consultar la configuración.
          </span>
          <button className="button button-primary" disabled={form.busy}>
            {form.busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </>
  )
}
