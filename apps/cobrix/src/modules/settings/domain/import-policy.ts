import { InvalidValueError } from '../../shared/domain/domain-error.ts'

export const CONTRACT_STATUSES = [
  'ACTIVO',
  'CORTADO',
  'CORTESIA',
  'RETIRADO',
  'RECHAZADO',
  'ANULADO',
] as const

export type ContractStatus = (typeof CONTRACT_STATUSES)[number]

export const DOCUMENT_TYPES = ['V', 'E', 'J', 'G', 'P'] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]

export type ImportWindowMonths = 3 | 6 | 9 | 12 | null

export interface ImportPolicyProps {
  statuses: readonly string[]
  importWindowMonths: number | null
  maxInstallmentsPerContract: number | null
  graceDays: number
  maxNewInvoices: number | null
  maxNewAmountMinorUnits: number | null
  excludedDocumentTypes: readonly string[]
}

function isContractStatus(value: string): value is ContractStatus {
  return (CONTRACT_STATUSES as readonly string[]).includes(value)
}

function isDocumentType(value: string): value is DocumentType {
  return (DOCUMENT_TYPES as readonly string[]).includes(value)
}

export class ImportPolicy {
  private constructor(
    readonly statuses: readonly ContractStatus[],
    readonly importWindowMonths: ImportWindowMonths,
    readonly maxInstallmentsPerContract: number | null,
    readonly graceDays: number,
    readonly maxNewInvoices: number | null,
    readonly maxNewAmountMinorUnits: number | null,
    readonly excludedDocumentTypes: readonly DocumentType[]
  ) {}

  static create(input: ImportPolicyProps): ImportPolicy {
    const statuses = [...new Set(input.statuses)]
    const excludedDocumentTypes = [...new Set(input.excludedDocumentTypes)]

    if (statuses.length === 0 || !statuses.every(isContractStatus)) {
      throw new InvalidValueError(
        'Debe seleccionarse al menos un estado de contrato válido.'
      )
    }

    if (!excludedDocumentTypes.every(isDocumentType)) {
      throw new InvalidValueError(
        'Hay tipos de documento excluidos que no son válidos.'
      )
    }

    const allowedWindows: readonly number[] = [3, 6, 9, 12]

    if (
      input.importWindowMonths !== null &&
      !allowedWindows.includes(input.importWindowMonths)
    ) {
      throw new InvalidValueError(
        'La ventana de importación debe ser 3, 6, 9, 12 meses o null.'
      )
    }

    const installmentLimit = input.maxInstallmentsPerContract

    if (
      installmentLimit !== null &&
      (!Number.isSafeInteger(installmentLimit) ||
        installmentLimit < 1 ||
        installmentLimit > 60)
    ) {
      throw new InvalidValueError(
        'El límite de cuotas debe estar entre 1 y 60, o ser null.'
      )
    }

    if (
      !Number.isSafeInteger(input.graceDays) ||
      input.graceDays < 0 ||
      input.graceDays > 60
    ) {
      throw new InvalidValueError(
        'Los días de gracia deben estar entre 0 y 60.'
      )
    }

    if (
      input.maxNewInvoices !== null &&
      !this.isPositiveSafeInteger(input.maxNewInvoices)
    ) {
      throw new InvalidValueError(
        'El límite de nuevas facturas debe ser un entero positivo o null.'
      )
    }

    if (
      input.maxNewAmountMinorUnits !== null &&
      !this.isPositiveSafeInteger(input.maxNewAmountMinorUnits)
    ) {
      throw new InvalidValueError(
        'El importe máximo debe ser un entero positivo en unidades menores o null.'
      )
    }

    return new ImportPolicy(
      statuses,
      input.importWindowMonths as ImportWindowMonths,
      installmentLimit,
      input.graceDays,
      input.maxNewInvoices,
      input.maxNewAmountMinorUnits,
      excludedDocumentTypes
    )
  }

  allowsStatus(status: string): boolean {
    return this.statuses.includes(status as ContractStatus)
  }

  excludesDocumentType(type: string): boolean {
    return this.excludedDocumentTypes.includes(type as DocumentType)
  }

  private static isPositiveSafeInteger(value: number): boolean {
    return Number.isSafeInteger(value) && value > 0
  }
}
