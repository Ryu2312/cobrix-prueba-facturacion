import { InvalidValueError } from '../../shared/domain/domain-error.ts'
import { EmailAddress } from './email-address.ts'

export interface CompanySettingsProps {
  name: string | null
  taxId: string | null
  collectionEmail: string | null
}

export class CompanySettings {
  private constructor(
    readonly name: string | null,
    readonly taxId: string | null,
    readonly collectionEmail: EmailAddress | null
  ) {}

  static create(input: CompanySettingsProps): CompanySettings {
    const name = input.name?.trim() || null
    const taxId = input.taxId?.trim() || null
    const email = input.collectionEmail?.trim() ?? ''

    if (name !== null && name.length > 150) {
      throw new InvalidValueError(
        'El nombre de la empresa no debe superar 150 caracteres.'
      )
    }

    if (taxId !== null && taxId.length > 50) {
      throw new InvalidValueError(
        'El identificador fiscal no debe superar 50 caracteres.'
      )
    }

    return new CompanySettings(
      name,
      taxId,
      email ? EmailAddress.create(email) : null
    )
  }
}
