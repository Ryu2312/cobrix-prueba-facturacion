import type { Run } from '../types.ts'
import { useResource } from '../hooks/useResource.ts'
import { Empty } from '../components/ui/Empty.tsx'
import { Notice } from '../components/ui/Notice.tsx'
import { RunTable } from '../components/tables/RunTable.tsx'
import { PageHeading } from '../components/PageHeading.tsx'

export function RunsPage() {
  const { data, loading, error, refresh } = useResource<Run[]>('/api/runs')
  return (
    <>
      <PageHeading
        eyebrow="AUDITORÍA"
        title="Historial de corridas"
        description="Ejecuciones reales y simuladas, con su estado y resumen."
      />
      <section className="panel">
        <Notice loading={loading} error={error} retry={refresh} />
        {data?.length ? (
          <RunTable runs={data} />
        ) : (
          !loading &&
          !error && (
            <Empty
              title="Aún no hay ejecuciones"
              text="Las corridas se registrarán aquí."
            />
          )
        )}
      </section>
    </>
  )
}
