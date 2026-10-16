export type DomainErrorCode =
  | 'INVALID_VALUE'
  | 'INVALID_STATE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVARIANT_VIOLATION'

export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: DomainErrorCode
  ) {
    super(message)
    this.name = new.target.name
  }
}

export class InvalidValueError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_VALUE')
  }
}

export class InvalidStateError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_STATE')
  }
}

export class InvariantViolationError extends DomainError {
  constructor(message: string) {
    super(message, 'INVARIANT_VIOLATION')
  }
}
