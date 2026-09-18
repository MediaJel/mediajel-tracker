import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { ComponentProps } from "react";
import { cn } from "~/lib/utils";

/**
 * shadcn's Button (radix-nova), re-cut for the work order.
 *
 * A button here is a rule drawn in the role colour on a 3px corner, set in the body face at
 * semibold; the identity-filled one is the only filled control on the sheet. What is left out is
 * deliberate: no `disabled:` styles, because the panel never disables a control — it marks the
 * one next action `aria-disabled` and says why underneath; no focus ring of its own, because the
 * base layer draws the 2px identity ring on everything; and no transition on `all`, only colour.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center border whitespace-nowrap font-semibold transition-colors duration-150 ease-out select-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-primary-foreground hover:bg-primary-hover",
        outline:
          "border-border bg-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground",
        destructive: "border-destructive bg-transparent text-warning-text",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:text-foreground",
        ghost: "border-transparent bg-transparent text-ink-faint hover:bg-stock hover:text-foreground",
        link: "border-0 bg-transparent p-0 font-normal text-primary underline underline-offset-2",
      },
      size: {
        default: "min-h-8 gap-1.5 rounded-sm px-3.5 text-base",
        xs: "min-h-6 gap-1 rounded-sm px-2.5 text-sm",
        /** The who-pill: the signed-in name, in the display face, on stock. */
        pill: "gap-1.5 rounded-full py-[5px] pr-[9px] pl-[7px] font-display text-xs font-normal tracking-[0.04em]",
        icon: "size-[30px] rounded-full p-0 font-normal",
        "icon-xs": "size-5 rounded-full p-0 font-normal [&_svg]:size-3.5",
        none: "",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  /** Render the child element with the button's classes instead of a `<button>`. */
  asChild?: boolean;
  /**
   * The action is in flight. The button keeps its ink so the bar does not go grey and dead under
   * the operator's eyes; the press inverts, which is what a key held down looks like, and a slow
   * wash crosses the label (`btn-working` in globals.css) — the only motion in the panel besides
   * a stamp landing.
   */
  working?: boolean;
}

export const Button = ({ className, variant, size, asChild = false, working = false, ...props }: ButtonProps) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      data-working={working || undefined}
      className={cn(buttonVariants({ variant, size }), working && "btn-working", className)}
      {...props}
    />
  );
};
