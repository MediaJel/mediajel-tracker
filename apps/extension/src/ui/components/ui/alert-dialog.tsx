import { Action, Cancel, Content, Description, Overlay, Portal, Root, Title } from "@radix-ui/react-alert-dialog";
import { ComponentProps } from "react";

import { Button, ButtonProps } from "~/ui/components/ui/button";
import { cn } from "~/lib/utils";

/**
 * shadcn's AlertDialog (radix-nova) as the work order's confirmation slip.
 *
 * The one irreversible thing the panel offers — throwing a job away — used to be an inline slip
 * under the letterhead that any click elsewhere could ignore. Radix makes it what it is: a modal
 * that traps focus, closes on Escape, and hands focus back to the button that opened it. It is
 * still drawn as a slip laid across the top of the sheet, ruled in partner ink, rather than a
 * centred card: this is paper, and a dialog box is the one idiom the material has no word for.
 */
export const AlertDialog = Root;

export const AlertDialogContent = ({ className, ...props }: ComponentProps<typeof Content>) => (
  <Portal>
    <Overlay data-slot="alert-dialog-overlay" className="fixed inset-0 z-50 bg-ink/10" />
    <Content
      data-slot="alert-dialog-content"
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b border-destructive bg-stock px-5 py-2.5 text-sm text-foreground shadow-press outline-hidden [&_p]:m-0",
        className,
      )}
      {...props}
    />
  </Portal>
);

/** The dialog's name, for assistive technology; the description carries the question itself. */
export const AlertDialogTitle = ({ className, ...props }: ComponentProps<typeof Title>) => (
  <Title data-slot="alert-dialog-title" className={cn("sr-only", className)} {...props} />
);

export const AlertDialogDescription = ({ className, ...props }: ComponentProps<typeof Description>) => (
  <Description data-slot="alert-dialog-description" className={cn("mt-0 mb-2", className)} {...props} />
);

export const AlertDialogFooter = ({ className, ...props }: ComponentProps<"div">) => (
  <div data-slot="alert-dialog-footer" className={cn("flex justify-end gap-2", className)} {...props} />
);

type ActionProps = ComponentProps<typeof Action> & Pick<ButtonProps, "variant" | "size">;

export const AlertDialogAction = ({ variant = "destructive", size, ...props }: ActionProps) => (
  <Button variant={variant} size={size} asChild>
    <Action data-slot="alert-dialog-action" {...props} />
  </Button>
);

type CancelProps = ComponentProps<typeof Cancel> & Pick<ButtonProps, "variant" | "size">;

export const AlertDialogCancel = ({ variant = "outline", size, ...props }: CancelProps) => (
  <Button variant={variant} size={size} asChild>
    <Cancel data-slot="alert-dialog-cancel" {...props} />
  </Button>
);
