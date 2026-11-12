export class DebtNotFoundError extends Error {
  constructor() {
    super("No se encontró la deuda.");
    this.name = "DebtNotFoundError";
  }
}
