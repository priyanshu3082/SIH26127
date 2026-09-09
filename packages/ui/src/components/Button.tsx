import * as React from "react";
import { cn } from "../utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-cyan-500 text-bg-0 hover:bg-cyan-400 active:bg-cyan-600 shadow-[0_0_0_1px_rgba(34,197,224,0.3)]",
  secondary: "bg-bg-3 text-text-primary hover:bg-bg-4 border border-border",
  outline: "bg-transparent text-text-primary border border-border hover:border-border-strong hover:bg-bg-2",
  ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-2",
  danger: "bg-red-500 text-bg-0 hover:bg-red-400 active:bg-red-600",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-11 px-5 text-md gap-2",
  icon: "h-9 w-9 p-0 justify-center",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-md font-display font-medium tracking-tight",
          "transition-colors duration-fast ease-out",
          "disabled:opacity-40 disabled:pointer-events-none",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-0",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
