import { WidgetSession } from "@mediajel/assistant-core/types";

import { BridgeDown } from "~/bridge/protocol";

/**
 * What a fresh document in a tab mid-job has to be told, if anything: a recording picks up from
 * where the clock was, a proof runs again. Pure, so the two cases are tested rather than trusted.
 */

const proofToResume = (session: WidgetSession): BridgeDown | null =>
  session.step === "verify" && session.generation ? { type: "verify", code: session.generation.code } : null;

export const resumption = (session: WidgetSession | null): BridgeDown | null => {
  if (!session) return null;
  if (session.step === "recording") return { type: "start-recording", startedAt: session.startedAt };
  return proofToResume(session);
};
