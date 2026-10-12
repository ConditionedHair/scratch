<script lang="ts">
  import { onDestroy } from "svelte";
  import { themeState } from "../../context/theme.svelte";
  import { cn } from "../../lib/utils";
  import { SIDEBAR_DEFAULT_PX, SIDEBAR_MIN_PX, SIDEBAR_MAX_PX } from "../../lib/sidebar";

  const DRAG_THRESHOLD_PX = 3;

  function applyWidthVar(px: number | null) {
    if (px === null) {
      document.documentElement.style.removeProperty("--sidebar-width");
    } else {
      document.documentElement.style.setProperty("--sidebar-width", `${px}px`);
    }
  }

  let isDragging = $state(false);
  let currentWidth = $state(0);

  let dragState: {
    startX: number;
    initialWidth: number;
    moved: boolean;
  } | null = null;

  let persistedWidth = $derived(themeState.sidebarWidthPx);

  onDestroy(() => {
    if (dragState) {
      document.documentElement.classList.remove("sidebar-no-transition");
      applyWidthVar(persistedWidth);
    }
  });

  function handlePointerDown(e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    target.focus();

    const initialWidth =
      themeState.sidebarWidthPx ?? target.parentElement!.offsetWidth;
    dragState = {
      startX: e.clientX,
      initialWidth,
      moved: false,
    };
    isDragging = true;
    currentWidth = initialWidth;
    document.documentElement.classList.add("sidebar-no-transition");
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragState) return;
    const { startX, initialWidth, moved } = dragState;

    const delta = e.clientX - startX;
    if (!moved && Math.abs(delta) < DRAG_THRESHOLD_PX) return;
    dragState.moved = true;

    const newWidth = initialWidth + delta;
    const clamped = Math.round(
      Math.min(Math.max(newWidth, SIDEBAR_MIN_PX), SIDEBAR_MAX_PX)
    );

    themeState.setSidebarWidthLive(clamped);
    currentWidth = clamped;
  }

  function handlePointerUp(e: PointerEvent) {
    if (!dragState) return;
    const { moved } = dragState;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    document.documentElement.classList.remove("sidebar-no-transition");

    if (moved) {
      themeState.setSidebarWidthPx(currentWidth);
    }
    dragState = null;
    isDragging = false;
  }

  function handlePointerCancel() {
    if (!dragState) return;
    document.documentElement.classList.remove("sidebar-no-transition");
    applyWidthVar(themeState.sidebarWidthPx);
    dragState = null;
    isDragging = false;
  }

  function handleDoubleClick() {
    themeState.setSidebarWidthPx(null);
  }

  function handleKeyDown(e: KeyboardEvent) {
    const step = e.shiftKey ? 64 : 16;
    const base =
      themeState.sidebarWidthPx ?? (e.currentTarget as HTMLElement).parentElement!.offsetWidth;
    let next: number | null = null;

    switch (e.key) {
      case "ArrowLeft":
        next = base - step;
        break;
      case "ArrowRight":
        next = base + step;
        break;
      case "Home":
        next = SIDEBAR_MIN_PX;
        break;
      case "End":
        next = SIDEBAR_MAX_PX;
        break;
      default:
        return;
    }

    e.preventDefault();
    themeState.setSidebarWidthPx(next);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  role="separator"
  aria-orientation="vertical"
  aria-label="Resize sidebar width"
  aria-valuenow={themeState.sidebarWidthPx ?? SIDEBAR_DEFAULT_PX}
  aria-valuemin={SIDEBAR_MIN_PX}
  aria-valuemax={SIDEBAR_MAX_PX}
  tabindex="0"
  class={cn(
    "absolute top-0 right-0 h-full w-1.5 cursor-col-resize pointer-events-auto group outline-none",
    isDragging && "z-20"
  )}
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerCancel}
  ondblclick={handleDoubleClick}
  onkeydown={handleKeyDown}
>
  <div
    class={cn(
      "absolute left-1/2 -translate-x-1/2 top-0 h-full w-0.75 rounded-full bg-border transition-opacity duration-150",
      isDragging
        ? "opacity-100"
        : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
    )}
  ></div>
  {#if isDragging}
    <div class="absolute top-3 right-2 z-50">
      <div class="bg-text text-text-inverse text-xs font-medium px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap">
        {Math.round(currentWidth)}px
      </div>
    </div>
  {/if}
</div>
