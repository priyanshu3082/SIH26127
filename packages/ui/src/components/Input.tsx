import * as React from "react";
import { cn } from "../utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-md border border-border bg-bg-2 px-3 text-sm text-text-primary placeholder:text-text-muted",
          "font-mono tracking-tight",
          "outline-none transition-colors duration-fast focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40",
          "disabled:opacity-40",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
