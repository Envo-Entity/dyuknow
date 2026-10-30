// Messages written for people, and the plain lines everything else becomes.

/** A refusal we can show as it is (a rule, or a P0001 from the database). */
export class Refusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Refusal";
  }
}

export const GENERIC_ERROR = "Couldn’t save. Try again.";
export const CONNECTION_ERROR = "Couldn’t save. Check your connection and try again.";

/** True for a Refusal (checked by name too, so it survives transpiled class chains). */
export function isRefusal(e: unknown): e is Refusal {
  return e instanceof Refusal || (e instanceof Error && e.name === "Refusal");
}
