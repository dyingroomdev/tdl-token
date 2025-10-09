import { ReactNode } from "react";
import clsx from "clsx";

type AlertProps = {
  children: ReactNode;
  variant?: "success" | "error" | "warning" | "info";
  className?: string;
};

const VARIANT_STYLES = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  error: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  info: "border-brand-500/40 bg-brand-500/10 text-brand-200",
};

export const Alert = ({ children, variant = "info", className }: AlertProps) => {
  return (
    <div
      className={clsx(
        "rounded-lg border px-4 py-3 text-sm",
        VARIANT_STYLES[variant],
        className
      )}
    >
      {children}
    </div>
  );
};
