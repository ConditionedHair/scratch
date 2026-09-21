import * as React from "react";
import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Tooltip } from "./Tooltip";
import { PinIcon } from "../icons";
import { getTagColor } from "../../lib/tags";

const MAX_VISIBLE_TAGS = 4;

// Re-export components
export {
  Tooltip,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
} from "./Tooltip";
export { Button } from "./Button";
export { CodeCopyButton } from "./CodeCopyButton";
export { Input } from "./Input";
export { Select } from "./Select";
export { Toaster } from "./Toaster";
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./AlertDialog";

// Toolbar button with active state and tooltip
interface ToolbarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  children: ReactNode;
}

export function ToolbarButton({
  isActive = false,
  className = "",
  children,
  title,
  ...props
}: ToolbarButtonProps) {
  const button = (
    <button
      className={cn(
        "h-7 w-7 flex items-center justify-center text-sm rounded transition-all duration-150 active:scale-90 shrink-0 cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
        isActive
          ? "bg-bg-muted text-text font-bold"
          : "hover:bg-bg-muted text-text-muted hover:text-text",
        className
      )}
      tabIndex={-1}
      aria-label={title}
      {...props}
    >
      {children}
    </button>
  );

  if (title) {
    return <Tooltip content={title}>{button}</Tooltip>;
  }

  return button;
}

// Icon button (for sidebar actions, etc.)
export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "default" | "secondary" | "ghost" | "outline";
  title?: string;
}

const iconButtonSizes = {
  xs: "w-6 h-6", // 24px
  sm: "w-7 h-7", // 28px
  md: "w-8 h-8", // 32px
  lg: "w-9 h-9", // 36px
  xl: "w-10 h-10", // 40px
};

const iconButtonVariants = {
  primary: "bg-accent text-text-inverse hover:bg-accent/90",
  default: "bg-bg-emphasis text-text hover:bg-bg-muted",
  secondary: "bg-bg-muted text-text hover:bg-bg-emphasis",
  ghost: "hover:bg-bg-muted text-text-muted hover:text-text",
  outline:
    "border border-border text-text-muted hover:bg-bg-muted hover:text-text",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { className, children, title, size = "sm", variant = "ghost", ...props },
    ref
  ) => {
    const button = (
      <button
        ref={ref}
        className={cn(
          "flex items-center justify-center rounded-md transition-all duration-150 active:scale-90",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          iconButtonSizes[size],
          iconButtonVariants[variant],
          className
        )}
        tabIndex={-1}
        aria-label={title}
        {...props}
      >
        {children}
      </button>
    );

    if (title) {
      return <Tooltip content={title}>{button}</Tooltip>;
    }

    return button;
  }
);
IconButton.displayName = "IconButton";

// List item for sidebar
interface ListItemProps {
  title: string;
  subtitle?: string;
  meta?: string;
  isSelected?: boolean;
  isPinned?: boolean;
  tags?: string[];
  tagColors?: Record<string, string>;
  onClick?: () => void;
  /** Optional status icon to display next to meta */
}

export function ListItem({
  title,
  subtitle,
  meta,
  isSelected = false,
  isPinned = false,
  tags,
  tagColors,
  onClick,
  onContextMenu,
}: ListItemProps & { onContextMenu?: (e: React.MouseEvent) => void }) {
  // Clean subtitle: treat whitespace-only or &nbsp; as empty
  const cleanSubtitle = subtitle
    ?.replace(/&nbsp;/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();
  const hasSubtitle = cleanSubtitle && cleanSubtitle.length > 0;

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      role="button"
      tabIndex={-1}
      className={cn(
        "relative w-full text-left p-2.5 transition-all duration-150 active:scale-[0.99] cursor-pointer select-none rounded-lg font-sans",
        "focus:outline-none",
        isSelected
          ? "bg-[#FAF8F5] dark:bg-[#1a1c22] border-l-2 border-l-ram-orange border-y border-r border-border dark:border-[#2a2c35] shadow-xs"
          : "bg-[#E2DED4]/60 dark:bg-[#16171b] border border-border/80 dark:border-[#22242a] hover:bg-[#EAE6DD] dark:hover:bg-[#1a1c22] dark:hover:border-[#2b2e37] text-text"
      )}
    >
      {/* Title & Status indicator */}
      <div className="flex items-baseline justify-between gap-1.5 mb-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {isPinned && (
            <PinIcon className="w-3.5 h-3.5 stroke-[1.6] fill-current text-ram-orange shrink-0" />
          )}
          <h4
            className={cn(
              "text-xs truncate",
              isSelected ? "font-semibold text-text" : "font-medium text-text/90"
            )}
          >
            {title}
          </h4>
        </div>
        {isSelected ? (
          <span className="text-[9px] font-mono font-bold text-ram-orange dark:text-ram-cyan uppercase tracking-tighter shrink-0">
            ACTIVE
          </span>
        ) : meta ? (
          <span className="text-[9px] font-mono text-text-muted shrink-0">
            {meta}
          </span>
        ) : null}
      </div>

      {/* Subtitle / Preview / Meta info in Monospace */}
      {hasSubtitle && (
        <p className="text-[10px] font-mono text-text-muted line-clamp-1 mb-1.5">
          {cleanSubtitle}
        </p>
      )}

      {/* Tag badges */}
      {tags && tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mt-1">
          {tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => {
            const color = getTagColor(tag, tagColors);
            return (
              <span
                key={tag}
                className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border/60 bg-bg-card text-text flex items-center gap-1"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span>{tag}</span>
              </span>
            );
          })}
          {tags.length > MAX_VISIBLE_TAGS && (
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-bg-card text-text-muted border border-border">
              +{tags.length - MAX_VISIBLE_TAGS}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Command palette item
interface CommandItemProps {
  label: string;
  subtitle?: string;
  shortcut?: string;
  icon?: ReactNode;
  iconText?: string;
  variant?: "note" | "command";
  isSelected?: boolean;
  onClick?: () => void;
}

export function CommandItem({
  label,
  subtitle,
  shortcut,
  icon,
  iconText,
  variant = "command",
  isSelected = false,
  onClick,
}: CommandItemProps) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={-1}
      className={cn(
        "w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-all duration-100 cursor-pointer border",
        isSelected
          ? "bg-bg-emphasis/90 border-border text-text shadow-xs translate-x-0.5"
          : "border-transparent text-text hover:bg-bg-muted/70"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {(icon || iconText) && (
          <div
            className={cn(
              "shrink-0 flex items-center justify-center text-text-muted",
              variant === "note" &&
                "w-8 h-8 rounded-lg bg-bg-card border border-border shadow-xs flex items-center justify-center font-mono font-bold text-xs text-primary"
            )}
          >
            {iconText ? (
              <span className="text-sm font-mono font-bold">
                {iconText}
              </span>
            ) : (
              icon
            )}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-mono font-semibold tracking-tight truncate">{label}</span>
          {subtitle && (
            <span className="text-[11px] font-mono truncate text-text-muted">{subtitle}</span>
          )}
        </div>
      </div>
      {shortcut && (
        <kbd
          className={cn(
            "text-[10px] font-mono px-2 py-0.5 rounded border shadow-keycap ml-2 shrink-0 font-bold",
            isSelected
              ? "bg-bg-card border-border text-primary"
              : "bg-bg-card border-border/80 text-text-muted"
          )}
        >
          {shortcut}
        </kbd>
      )}
    </div>
  );
}
