import { ComponentProps } from "react";

import { cn } from "~/lib/utils";

/**
 * shadcn's Table (radix-nova) as the panel's ruled box: rows separated by hairlines inside one
 * rule on a 3px corner, no hover wash, no selected state — these tables are read, not worked.
 * The container, footer and caption of the stock component are not kept; a header exists so a
 * column can name itself to a screen reader (`sr-only`) while the sheet prints the names once
 * or not at all.
 */
export const Table = ({ className, ...props }: ComponentProps<"table">) => (
  <table
    data-slot="table"
    className={cn("w-full border-separate border-spacing-0 rounded-sm border border-border text-xs", className)}
    {...props}
  />
);

export const TableHeader = ({ className, ...props }: ComponentProps<"thead">) => (
  <thead data-slot="table-header" className={cn(className)} {...props} />
);

export const TableBody = ({ className, ...props }: ComponentProps<"tbody">) => (
  <tbody
    data-slot="table-body"
    className={cn("[&_tr+tr>*]:border-t [&_tr+tr>*]:border-border", className)}
    {...props}
  />
);

export const TableRow = ({ className, ...props }: ComponentProps<"tr">) => (
  <tr data-slot="table-row" className={cn(className)} {...props} />
);

export const TableHead = ({ className, ...props }: ComponentProps<"th">) => (
  <th
    data-slot="table-head"
    className={cn("px-2 py-[3px] text-left align-baseline font-normal", className)}
    {...props}
  />
);

export const TableCell = ({ className, ...props }: ComponentProps<"td">) => (
  <td data-slot="table-cell" className={cn("px-2 py-[3px] align-baseline wrap-anywhere", className)} {...props} />
);
