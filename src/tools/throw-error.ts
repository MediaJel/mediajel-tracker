import { ErrorContext } from "../interface";

export function throwError(context: ErrorContext): void {
  const { name, cause } = context;

  throw new Error(`Error located at ${name} ${cause ?? ""}`);
}
