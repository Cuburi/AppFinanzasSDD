export class PocketNotFoundError extends Error {
  constructor() {
    super("No se encontró el bolsillo.");
    this.name = "PocketNotFoundError";
  }
}
