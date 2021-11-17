import { ContextArg, ErrorContext } from "../interface";
import { throwError } from "./throw-error";

// Checks if present candidate scripts is more than 1
export function handleIsDuplicate(context: ContextArg[]): ContextArg {
  if (context.length > 1) {
    console.error(
      "Please review pixel implementation as duplicate tags are being implemented"
    );
    // throwError({
    //   name: "handleIsDuplicate:",
    //   cause: "Tracker is being invoked multiple times",
    // });
    return context[0];
  }
}
