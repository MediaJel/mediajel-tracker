import { ContextArg, ErrorContext } from "../interface";
import { throwError } from "./throw-error";

// Checks if present candidate scripts is more than 1
export function handleIsDuplicate(context: ContextArg[]): ContextArg[] {
  if (context.length > 1) {
    console.log(context);
    throwError({ name: "handleIsDuplicate:", cause: "Duplicate string" });
  } else {
    return context;
  }
}
