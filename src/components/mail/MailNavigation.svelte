<script lang="ts">
  import { mailState } from "../../context/mail.svelte";
  import {
    InboxIcon,
    StarIcon,
    SendIcon,
    ArchiveIcon,
    TrashIcon,
    RefreshCwIcon,
    SpinnerIcon,
    PlusIcon,
  } from "../icons";

  interface Props {
    onOpenCompose: () => void;
  }

  let { onOpenCompose }: Props = $props();

  const SYSTEM_FOLDERS = [
    { id: "INBOX", label: "Inbox", icon: InboxIcon },
    { id: "STARRED", label: "Starred", icon: StarIcon },
    { id: "SENT", label: "Sent", icon: SendIcon },
    { id: "ARCHIVE", label: "Archive", icon: ArchiveIcon },
    { id: "TRASH", label: "Trash", icon: TrashIcon },
  ];

  let userLabels = $derived(
    mailState.labels.filter(
      (l) =>
        l.labelType === "user" &&
        !["CATEGORY_PERSONAL", "CATEGORY_SOCIAL", "CATEGORY_PROMOTIONS", "CATEGORY_UPDATES", "CATEGORY_FORUMS"].includes(l.id)
    )
  );
</script>

<aside class="w-full h-full flex flex-col select-none bg-bg-secondary text-text transition-colors">
  <!-- Mail Header Strip with Signal Accent Compose Button -->
  <div class="h-11 px-3.5 border-b border-border flex items-center justify-between shrink-0">
    <div class="flex items-center gap-2">
      <span class="text-[11px] font-bold tracking-wider uppercase text-text-muted">
        MAIL
      </span>
      {#if mailState.isSyncing}
        <SpinnerIcon class="w-3 h-3 animate-spin text-text-muted/60" />
      {/if}
    </div>

    <!-- Signal Yellow Circular Compose Button -->
    <button
      type="button"
      onclick={onOpenCompose}
      class="w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer hover:brightness-105 active:scale-95 bg-accent text-slate-950 font-bold shadow-xs"
      title="Compose Email (C)"
    >
      <PlusIcon class="w-3.5 h-3.5 stroke-[2.5]" />
    </button>
  </div>

  <!-- Navigation Folders & Labels List -->
  <div class="flex-1 overflow-y-auto p-2 space-y-4">
    <!-- Core Mail Folders -->
    <div class="space-y-0.5">
      {#each SYSTEM_FOLDERS as folder (folder.id)}
        {@const Icon = folder.icon}
        {@const isActive = mailState.activeLabelId === folder.id}
        <button
          type="button"
          onclick={() => mailState.setActiveLabel(folder.id)}
          class={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
            isActive
              ? "bg-bg-emphasis text-text font-semibold shadow-2xs"
              : "text-text-muted hover:text-text hover:bg-bg-muted/70 font-medium"
          }`}
        >
          <div class="flex items-center gap-2">
            <Icon class="w-4 h-4 opacity-75 stroke-[1.8]" />
            <span>{folder.label}</span>
          </div>

          {#if folder.id === "INBOX" && mailState.unreadCount > 0}
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-accent text-slate-950 shadow-2xs">
              {mailState.unreadCount}
            </span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- User Labels Section (if available) -->
    {#if userLabels.length > 0}
      <div>
        <div class="text-[10px] font-bold uppercase tracking-wider text-text-muted px-2.5 mb-1.5 flex items-center justify-between">
          <span>LABELS</span>
          <span class="font-mono text-[9px] text-text-muted/60">{userLabels.length}</span>
        </div>
        <div class="space-y-0.5">
          {#each userLabels as label (label.id)}
            {@const isActive = mailState.activeLabelId === label.id}
            <button
              type="button"
              onclick={() => mailState.setActiveLabel(label.id)}
              class={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                isActive
                  ? "bg-bg-emphasis text-text font-semibold shadow-2xs"
                  : "text-text-muted hover:text-text hover:bg-bg-muted/70 font-medium"
              }`}
            >
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="w-2 h-2 rounded-full shrink-0 shadow-2xs"
                  style:background-color={label.bgColor || "#71717a"}
                ></span>
                <span class="truncate">{label.name}</span>
              </div>
              {#if label.unreadCount > 0}
                <span class="text-[10px] font-mono px-1 py-0.2 rounded bg-bg-muted text-text-muted">
                  {label.unreadCount}
                </span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Bottom Account & Status Strip -->
  <div class="p-2 border-t border-border flex items-center justify-between text-xs text-text-muted shrink-0">
    <div class="flex items-center gap-1.5 min-w-0 flex-1 px-1">
      <span class="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500"></span>
      <span class="truncate text-[11px] font-mono text-text-muted/80" title={mailState.userEmail || "Connected"}>
        {mailState.userEmail || "Gmail Connected"}
      </span>
    </div>

    <button
      type="button"
      onclick={() => mailState.refresh()}
      class="p-1 rounded-md hover:bg-bg-muted text-text-muted hover:text-text transition-colors cursor-pointer"
      title="Sync Mail Now"
    >
      <RefreshCwIcon class={`w-3.5 h-3.5 stroke-[1.8] ${mailState.isSyncing ? "animate-spin" : ""}`} />
    </button>
  </div>
</aside>
