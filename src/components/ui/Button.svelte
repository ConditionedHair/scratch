<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import { cn } from "../../lib/utils";

  type ButtonVariant = "primary" | "default" | "secondary" | "ghost" | "outline" | "link";
  type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

  const buttonSizes: Record<ButtonSize, string> = {
    xs: "h-6 px-2 text-xs",
    sm: "h-7 px-2.5 text-sm",
    md: "h-8 px-3 text-sm",
    lg: "h-9 px-4",
    xl: "h-10 px-5",
  };

  const buttonVariants: Record<ButtonVariant, string> = {
    primary: "bg-accent text-text-inverse hover:bg-accent/90 rounded-md",
    default: "bg-bg-muted text-text hover:bg-bg-emphasis rounded-md",
    secondary: "bg-bg-muted text-text hover:bg-bg-emphasis rounded-md",
    ghost: "hover:bg-bg-muted text-text-muted hover:text-text rounded-md",
    outline: "border border-border bg-transparent hover:bg-bg-muted text-text rounded-md",
    link: "text-text-muted hover:text-text underline-offset-4 hover:underline",
  };

  interface Props extends HTMLButtonAttributes {
    variant?: ButtonVariant;
    size?: ButtonSize;
    class?: string;
    children?: Snippet;
  }

  let {
    variant = "default",
    size = "md",
    class: className = "",
    type = "button",
    children,
    ...restProps
  }: Props = $props();
</script>

<button
  type={type}
  class={cn(
    "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors",
    "focus-visible:outline focus-visible:outline-accent",
    "disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
    buttonSizes[size],
    buttonVariants[variant],
    className
  )}
  {...restProps}
>
  {@render children?.()}
</button>
