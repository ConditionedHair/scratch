import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "default" | "secondary" | "ghost" | "outline" | "link";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const buttonSizes = {
  xs: "h-6 px-2 text-[11px] font-mono", // 24px
  sm: "h-7 px-2.5 text-xs font-mono", // 28px
  md: "h-8 px-3 text-xs font-mono", // 32px
  lg: "h-9 px-4 text-sm font-mono", // 36px
  xl: "h-10 px-5 text-base font-mono", // 40px
};

const buttonVariants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg chiclet-btn font-bold tracking-wider uppercase shadow-md active:translate-y-0.5",
  default: "bg-bg-card border border-border text-text hover:bg-bg-emphasis rounded-lg shadow-keycap active:translate-y-0.5",
  secondary: "bg-bg-card border border-border text-text hover:bg-bg-emphasis rounded-lg shadow-keycap active:translate-y-0.5",
  ghost: "hover:bg-bg-muted text-text-muted hover:text-text rounded-md",
  outline:
    "border border-border bg-bg-card/60 hover:bg-bg-muted text-text rounded-lg shadow-xs",
  link: "text-text-muted hover:text-text underline-offset-4 hover:underline",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all",
          "focus-visible:outline focus-visible:outline-accent",
          "disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
          buttonSizes[size],
          buttonVariants[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
