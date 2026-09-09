import * as React from "react";
import { cn } from "../utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gradient-to-r from-bg-2 via-bg-3 to-bg-2 bg-[length:200%_100%]", className)}
      {...props}
    />
  );
}
