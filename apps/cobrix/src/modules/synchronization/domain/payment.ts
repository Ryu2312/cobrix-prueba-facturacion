export interface PaymentEvidence {
  readonly saldo: number
  readonly paid: number
  readonly discount: number
}

export type PaymentClassification =
  | { readonly status: 'paid'; readonly reason: string }
  | { readonly status: 'partial'; readonly reason: string }
  | { readonly status: 'exempt'; readonly reason: string }
  | { readonly status: 'open'; readonly reason: string }
  | { readonly status: 'no_evidence'; readonly reason: string }
  | { readonly status: 'contradictory'; readonly reason: string }

const EPSILON = 0.005

export function classifyPayment(
  invoiceBalance: number,
  records: readonly PaymentEvidence[]
): PaymentClassification {
  if (records.length === 0)
    return {
      status: 'no_evidence',
      reason: 'La cuota no aparece en el libro de pagos.',
    }

  const first = records[0]!
  if (
    records.some(
      (row) =>
        Math.abs(row.saldo - first.saldo) > EPSILON ||
        Math.abs(row.paid - first.paid) > EPSILON ||
        Math.abs(row.discount - first.discount) > EPSILON
    )
  ) {
    return {
      status: 'contradictory',
      reason: 'Los registros del libro discrepan sobre el estado de la cuota.',
    }
  }

  if (first.saldo < -EPSILON || first.paid < -EPSILON)
    return {
      status: 'contradictory',
      reason: 'El libro contiene importes negativos incompatibles.',
    }

  if (first.saldo <= EPSILON) {
    if (first.paid > EPSILON)
      return {
        status: 'paid',
        reason: 'Saldo cero con evidencia de importe pagado.',
      }
    return {
      status: 'exempt',
      reason: 'Saldo cero sin importe pagado: posible exoneración.',
    }
  }

  if (first.saldo < invoiceBalance - EPSILON)
    return {
      status: 'partial',
      reason: 'El saldo disminuyó, pero la cuota aún no está pagada.',
    }

  if (first.saldo > invoiceBalance + EPSILON)
    return {
      status: 'open',
      reason: 'El saldo aumentó o se revirtió; la factura permanece abierta.',
    }

  return { status: 'open', reason: 'La cuota conserva su saldo inicial.' }
}
