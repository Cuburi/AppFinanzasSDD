export class PocketNotFoundError extends Error {
  constructor() {
    super("Pocket was not found.");
    this.name = "PocketNotFoundError";
  }
}
