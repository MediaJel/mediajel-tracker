import { ComponentProps } from "react";

import { cn } from "~/lib/utils";

/**
 * shadcn's Card (radix-nova) as the suggestion card: the one thing on the sheet allowed a softer
 * corner and a cast shadow, because it is the assistant's guess laid on top of the record rather
 * than part of it. Ruled in identity ink. The stock component's header, title, description and
 * action slots are not kept: the guess writes its own head, and the footer is its two answers.
 */
export const Card = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    data-slot="card"
    className={cn("mb-2.5 rounded-xl border border-primary bg-card p-3 text-card-foreground shadow-guess", className)}
    {...props}
  />
);

export const CardFooter = ({ className, ...props }: ComponentProps<"div">) => (
  <div data-slot="card-footer" className={cn("mt-3 flex justify-end gap-2", className)} {...props} />
);
