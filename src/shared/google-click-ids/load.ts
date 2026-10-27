/**
 * Entry-script side of click-ID persistence: on pages where it runs (gate.ts), downloads the runtime as its own chunk
 * and starts it, so the entry script carries only the rollout check. Never throws into the host page.
 */
import logger from "src/shared/logger";
import { QueryStringContext } from "src/shared/types";

import { clickIdsEnabled } from "./gate";

export const loadClickIds = (context: QueryStringContext): void => {
  if (!clickIdsEnabled(context, window)) return;
  import("./index")
    .then(({ startClickIds }) => startClickIds(context))
    .catch((error) => logger.warn("Google click ID persistence could not load", error));
};
