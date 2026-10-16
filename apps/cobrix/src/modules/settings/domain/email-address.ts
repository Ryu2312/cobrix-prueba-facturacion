import { InvalidValueError } from '../../shared/domain/domain-error.ts'

export class EmailAddress {
  private constructor(readonly value: string) {}

  static create(value: string): EmailAddress {
    const normalized = value.trim().toLowerCase()

    if (
      normalized.length === 0 ||
      normalized.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ) {
      throw new InvalidValueError('El correo no es válido.')
    }

    return new EmailAddress(normalized)
  }

  equals(other: EmailAddress): boolean {
    return this.value === other.value
  }
}
