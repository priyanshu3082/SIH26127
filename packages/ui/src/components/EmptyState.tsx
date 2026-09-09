import * as React from "react";
import { cn } from "../utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ className, icon, title, description, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {icon && <div className="mb-1 text-text-muted">{icon}</div>}
      <p className="font-display text-sm font-medium text-text-secondary">{title}</p>
      {description && <p className="max-w-xs font-mono text-xs text-text-muted">{description}</p>}
    </div>
  );
}
