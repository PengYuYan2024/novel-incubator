export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function validationError(
  message: string,
  fields: Record<string, string[]>,
): DomainError {
  return new DomainError("VALIDATION_ERROR", message, fields);
}
