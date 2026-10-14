import { ComponentProps, ReactNode } from "react";

import { cn } from "~/lib/utils";

/**
 * The pieces every section of the work order is written with: its body, its opening line, the
 * fine print, the note in the margin, the row of buttons at its foot, and the small caps that
 * head a field or a list. Each is a sentence on paper first and a component second.
 */

export const SectionBody = ({ className, ...props }: ComponentProps<"div">) => (
  <div data-slot="section-body" className={cn("px-5 pt-1 pb-5", className)} {...props} />
);

/** The section's opening line, in soft ink. */
export const Lede = ({ className, ...props }: ComponentProps<"p">) => (
  <p className={cn("mt-0 mb-3 text-muted-foreground", className)} {...props} />
);

/** The fine print: a caveat, a note on what happens next, the words nobody needs to decide. */
export const Fine = ({ className, ...props }: ComponentProps<"p">) => (
  <p className={cn("mt-0 mb-1 text-xs text-muted-foreground", className)} {...props} />
);

/**
 * An empty state that teaches rather than shrugs. Indented against the sheet's own rule so it
 * reads as a note in the margin, which is what it is.
 */
export const Empty = ({ className, ...props }: ComponentProps<"p">) => (
  <p
    className={cn("mt-3 mb-0 border-l border-border pl-3 text-md leading-[1.55] text-muted-foreground", className)}
    {...props}
  />
);

/** The row of secondary actions at a section's foot. A lone button keeps to the right. */
export const SectionFooter = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    data-slot="section-footer"
    className={cn("mt-3.5 flex justify-between gap-2 [&>:only-child]:ml-auto", className)}
    {...props}
  />
);

/** The small caps that head a field, a list or a count — the sheet's smallest heading. */
export const Eyebrow = ({ className, ...props }: ComponentProps<"span">) => (
  <span className={cn("font-display text-2xs tracking-label text-muted-foreground uppercase", className)} {...props} />
);

/** The recording light: identity ink, pulsing while something is live. */
export const RecDot = (): ReactNode => (
  <span className="size-2 flex-none rounded-full bg-primary motion-safe:animate-rec" aria-hidden="true" />
);

/** Something in flight, said in machine text beside the recording light. Paper does not spin. */
export const Working = ({ children }: { children: ReactNode }): ReactNode => (
  <div data-slot="working" className="mb-3 flex items-center gap-2 font-mono text-sm text-muted-foreground">
    <RecDot />
    <span>{children}</span>
  </div>
);

/** Machine text — a payload, a file's first lines — printed on stock behind a dashed rule. */
export const Machine = ({ className, ...props }: ComponentProps<"pre">) => (
  <pre
    className={cn(
      "m-0 max-h-[220px] overflow-auto border-t border-dashed border-border bg-stock px-2.5 py-2 font-mono text-2xs leading-[1.45] wrap-anywhere whitespace-pre-wrap",
      className,
    )}
    {...props}
  />
);

/** A titled group of a report sheet: its heading behind a hairline, with room above it, so the sheet reads in parts. */
export const SheetGroup = ({ title, className, children, ...props }: ComponentProps<"div"> & { title: string }) => (
  <div className={cn("mt-5 border-t border-border pt-3.5", className)} {...props}>
    <h4 className="mt-0 mb-2 font-display text-base font-semibold text-foreground">{title}</h4>
    {children}
  </div>
);
