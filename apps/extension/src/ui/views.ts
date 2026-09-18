/**
 * The work order's views, in the order their tabs are printed.
 *
 * Overview is what a site is doing (the tally), Analytics is the whole of it per tag, and
 * Tracking setup is the job — record the event, write the tag, prove it here, deploy it. Named
 * for what an operator finds there, not for the code behind it.
 */
export type View = "overview" | "analytics" | "setup";

export const VIEWS: readonly { id: View; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "analytics", label: "Analytics" },
  { id: "setup", label: "Tracking setup" },
];
