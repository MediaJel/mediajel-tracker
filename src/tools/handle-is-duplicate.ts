import { getBasedOnKeyword } from "../tracker-config/utils";
import { ContextArg } from "../interface";

// Todo: Refactor
// Set types
// Refactor boolean determiner
export function handleIsDuplicate(context: ContextArg[]) {
  if (context.length > 1) {
    console.error("Pixel of the same nature already installed");
  } else {
    return context;
  }
}
