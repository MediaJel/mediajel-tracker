import { HTMLAttributes, ReactNode } from "react";
import { cn } from "~/lib/utils";

/**
 * The panel: as tall as its viewport, the live sheet's colour, laid out top to bottom. A plain
 * one — the popup's states, sign-in, a tab with no site — has no stack and no action bar, so it
 * pads its own content instead of leaving that to the sections.
 */
export const Panel = ({ plain = false, children }: { plain?: boolean; children: ReactNode }): ReactNode => (
  <div className={cn("flex h-screen flex-col bg-sheet", plain && "gap-3 overflow-y-auto p-5")}>{children}</div>
);

/**
 * The carbon stack's ground: the stock the slips and the live sheet lie on, taking whatever
 * height the letterhead and the action bar leave, and scrolling on its own. The scroll IS the
 * record of the job.
 */
const STACK = "m-0 flex-auto list-none overflow-y-auto bg-stock p-0 pb-2.5";

export const Stack = ({ list = false, className, ...props }: { list?: boolean } & HTMLAttributes<HTMLElement>) =>
  list ? <ol className={cn(STACK, className)} {...props} /> : <div className={cn(STACK, className)} {...props} />;
