import { ReactNode } from "react";

import { Mark } from "~/ui/icons";

/**
 * The letterhead: the mark, MEDIAJEL, a hairline, and what this sheet is — WORK ORDER, YOUR JOBS,
 * INTEGRATIONS ASSISTANT. Every surface opens with it, so it is written once; the work order
 * hangs its two controls off the right end.
 */
export const Letterhead = ({ title, children }: { title: string; children?: ReactNode }): ReactNode => (
  <div className="flex items-center gap-[9px]">
    <Mark className="block size-[18px] flex-none [filter:var(--mj-mark-filter)]" />
    <span className="font-display text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
      MediaJel
    </span>
    <span className="h-[11px] w-px flex-none bg-border" aria-hidden="true" />
    <span className="font-display text-xs tracking-caps text-ink-faint uppercase">{title}</span>
    {children ? <div className="ml-auto flex items-center gap-0.5">{children}</div> : null}
  </div>
);
