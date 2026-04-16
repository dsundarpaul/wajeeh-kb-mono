"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentPropsWithoutRef<"select">
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn("input", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

export { Select };
