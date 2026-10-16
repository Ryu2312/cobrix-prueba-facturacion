import { InvalidValueError } from '../../shared/domain/domain-error.ts'

export interface SyncScheduleProps {
  enabled: boolean
  time: string
}

export class SyncSchedule {
  private constructor(
    readonly enabled: boolean,
    readonly time: string
  ) {}

  static create(input: SyncScheduleProps): SyncSchedule {
    if (typeof input.enabled !== 'boolean') {
      throw new InvalidValueError(
        'El estado de la programación debe ser booleano.'
      )
    }

    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.test(input.time)

    if (!match) {
      throw new InvalidValueError(
        'La hora debe tener formato HH:mm, entre 00:00 y 23:59.'
      )
    }

    return new SyncSchedule(input.enabled, input.time)
  }
}
