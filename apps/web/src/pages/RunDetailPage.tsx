import { Link, useParams } from 'react-router'

import type { Run } from '../types.ts'
import { useResource } from '../hooks/useResource.ts'
import { Notice } from '../components/ui/Notice.tsx'
import { RunResult } from '../components/sync/RunResult.tsx'
import { PageHeading } from '../components/PageHeading.tsx'

export function RunDetailPage() {
  const { id = '' } = useParams()
  const { data, loading, error, refresh } = useResource<Run>(
    `/api/runs/${encodeURIComponent(id)}`
  )
  return (
    <>
      <Link className="back-link" to="/runs">
        ← Volver al historial
      </Link>
      <PageHeading
        eyebrow="DETALLE DE CORRIDA"
        title={`Corrida #${id}`}
        description="Resultado registrado por el backend."
      />
      <Notice loading={loading} error={error} retry={refresh} />
      {data && <RunResult run={data} />}
    </>
  )
}
