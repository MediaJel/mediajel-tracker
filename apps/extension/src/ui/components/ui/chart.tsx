import { ComponentProps } from "react";
import { ResponsiveContainer, Tooltip } from "recharts";

import { cn } from "~/lib/utils";

/**
 * shadcn's Chart (radix-nova), reduced to the two pieces one series needs: the container that
 * gives recharts its width and takes its chrome away, and the tooltip. The config context, the
 * per-series colour style and the stock tooltip content are not kept — the figure draws one
 * measure per band in the record's own ink, and prints the day it is reading above the bands,
 * never over them.
 */
export const ChartContainer = ({
  className,
  children,
  ...props
}: ComponentProps<"div"> & { children: ComponentProps<typeof ResponsiveContainer>["children"] }) => (
  <div
    data-slot="chart"
    className={cn(
      "flex w-full justify-center text-xs [&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden [&_svg]:overflow-visible",
      className,
    )}
    {...props}
  >
    <ResponsiveContainer>{children}</ResponsiveContainer>
  </div>
);

export const ChartTooltip = Tooltip;
