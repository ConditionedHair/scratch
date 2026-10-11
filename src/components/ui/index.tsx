import * as React from "react";
import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Tooltip } from "./Tooltip";
import { PinIcon } from "../icons";
import { getTagColor, tagPillStyle } from "../../lib/tags";

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
        "h-7 w-7 flex items-center justify-center text-sm rounded transition-colors shrink-0",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
        isActive
          ? "bg-bg-emphasis text-text font-medium shadow-xs"
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
  primary: "bg-accent text-slate-950 font-semibold hover:brightness-105 active:scale-95 shadow-xs",
  default: "bg-bg-emphasis text-text hover:bg-bg-muted active:scale-95",
  secondary: "bg-bg-muted text-text hover:bg-bg-emphasis active:scale-95",
  ghost: "hover:bg-bg-muted text-text-muted hover:text-text active:scale-95",
  outline:
    "border border-border text-text-muted hover:bg-bg-muted hover:text-text active:scale-95",
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
          "flex items-center justify-center rounded-md transition-colors",
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
        "w-full text-left px-3 py-2.5 transition-all cursor-pointer select-none rounded-xl border",
        "focus:outline-none focus-visible:outline-none",
        isSelected
          ? "bg-bg border-border shadow-xs"
          : "bg-transparent border-transparent hover:bg-bg/50 hover:border-border/30 text-text"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isPinned && (
            <PinIcon className="w-3.5 h-3.5 stroke-[1.6] fill-current text-accent shrink-0" />
          )}
          <span className={cn("text-xs font-semibold truncate text-text")}>
            {title}
          </span>
        </div>
        {isSelected && (
          <span className="w-2 h-2 rounded-full shrink-0 bg-accent shadow-xs" />
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
        {meta && (
          <div
            className={cn(
              "text-[11px] whitespace-nowrap font-mono",
              isSelected ? "text-text-muted font-medium" : "text-text-muted/80"
            )}
          >
            {meta}
          </div>
        )}
        <p
          className={cn(
            "text-xs line-clamp-1 min-h-5",
            hasSubtitle ? "text-text-muted" : "text-transparent",
            isSelected ? "opacity-100" : "opacity-75"
          )}
        >
          {hasSubtitle ? cleanSubtitle : "\u00A0"}
        </p>
      </div>
      {tags && tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mt-1">
          {tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
            <span
              key={tag}
              style={tagPillStyle(getTagColor(tag, tagColors))}
              className="text-2xs px-1.5 py-0.5 rounded-full font-medium leading-none"
            >
              {tag}
            </span>
          ))}
          {tags.length > MAX_VISIBLE_TAGS && (
            <span className="text-2xs px-1.5 py-0.5 rounded-full font-medium leading-none bg-bg-muted text-text-muted">
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
        "w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer border",
        isSelected
          ? "bg-bg-emphasis border-border text-text shadow-xs"
          : "border-transparent text-text hover:bg-bg-muted/60"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {(icon || iconText) && (
          <div
            className={cn(
              "shrink-0 flex items-center justify-center text-text-muted",
              variant === "note" &&
                "w-9 h-9 rounded-md bg-bg-emphasis flex items-center justify-center"
            )}
          >
            {iconText ? (
              <span className="text-xl text-text-muted font-serif">
                {iconText}
              </span>
            ) : (
              icon
            )}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="text-[15px] font-medium truncate">{label}</span>
          {subtitle && (
            <span className="text-sm truncate text-text-muted">{subtitle}</span>
          )}
        </div>
      </div>
      {shortcut && (
        <kbd
          className={cn(
            "text-xs px-2 py-0.5 rounded-md ml-2",
            isSelected ? "bg-bg-muted text-text" : "bg-bg-muted text-text-muted"
          )}
        >
          {shortcut}
        </kbd>
      )}
    </div>
  );
}
