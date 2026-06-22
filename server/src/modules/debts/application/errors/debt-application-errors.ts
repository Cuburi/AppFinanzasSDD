export class DebtNotFoundError extends Error {
  constructor() {
    super("Debt not found.");
    this.name = "DebtNotFoundError";
  }
}
