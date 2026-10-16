import { describe, expect, it } from 'vitest'

import {
  contractIsImportable,
  isUsdCoherent,
} from '../src/modules/synchronization/domain/contract.ts'
import { normalizeIdentity } from '../src/modules/synchronization/domain/identity.ts'
import { parsePeriod } from '../src/modules/synchronization/domain/period.ts'
import { classifyPayment } from '../src/modules/synchronization/domain/payment.ts'

describe('reglas de dominio', () => {
  it.each([
    ['V-12345678', 'V12345678'],
    ['09000123', '9000123'],
    ['J-40123456-7', 'J401234567'],
  ])('normaliza %s', (input, expected) => {
    expect(normalizeIdentity(input)?.id).toBe(expected)
  })

  it('rechaza identificaciones inválidas y reconoce personas jurídicas', () => {
    expect(normalizeIdentity('123')).toBeNull()
    expect(normalizeIdentity('J-40123456-7')?.legalEntity).toBe(true)
    expect(normalizeIdentity('E-123456')?.legalEntity).toBe(false)
  })

  it('extrae el período en español únicamente si es inequívoco', () => {
    expect(parsePeriod(['PLAN15MB25 - 2026 Agosto'])).toBe('2026-08')
    expect(parsePeriod(['PLAN - fecha desconocida'])).toBeNull()
    expect(parsePeriod(['2026 Agosto', '2026 Septiembre'])).toBeNull()
  })

  it('filtra estados y moneda incoherente', () => {
    const contract = {
      contractId: 1,
      code: '1',
      status: 'CORTADO',
      identity: 'V-12345678',
      name: 'A',
      email: '',
      phone: '',
      address: '',
      plan: 'P',
      price: 25,
      currency: 'USD',
      branch: 'CCS',
    }
    expect(contractIsImportable(contract, ['ACTIVO', 'CORTADO'])).toBe(true)
    expect(
      contractIsImportable({ ...contract, status: 'ANULADO' }, [
        'ACTIVO',
        'CORTADO',
      ])
    ).toBe(false)
    expect(isUsdCoherent('USD', 25, 0.2)).toBe(false)
    expect(isUsdCoherent('USD', 25, 0.25)).toBe(true)
    expect(isUsdCoherent('VES', 25, 25)).toBe(false)
  })

  it('solo marca pagos completos con saldo cero y evidencia pagada', () => {
    expect(
      classifyPayment(20, [{ saldo: 0, paid: 20, discount: 0 }]).status
    ).toBe('paid')
    expect(
      classifyPayment(20, [{ saldo: 15, paid: 5, discount: 0 }]).status
    ).toBe('partial')
    expect(
      classifyPayment(20, [{ saldo: 0, paid: 0, discount: -20 }]).status
    ).toBe('exempt')
    expect(classifyPayment(20, []).status).toBe('no_evidence')
    expect(
      classifyPayment(20, [
        { saldo: 0, paid: 20, discount: 0 },
        { saldo: 10, paid: 10, discount: 0 },
      ]).status
    ).toBe('contradictory')
  })
})
