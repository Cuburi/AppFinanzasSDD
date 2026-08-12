export class DomainError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class SemanticError extends DomainError {
  constructor(
    public readonly code: string,
    statusCode: number,
    message: string,
  ) {
    super(statusCode, message);
    this.name = "SemanticError";
  }
}
