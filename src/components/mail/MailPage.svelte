<script lang="ts">
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { mailState } from "../../context/mail.svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { isMac } from "../../lib/platform";
  import MailNavigation from "./MailNavigation.svelte";
  import MailThreadList from "./MailThreadList.svelte";
  import MailThreadReader from "./MailThreadReader.svelte";
  import MailComposerModal from "./MailComposerModal.svelte";
  import {
    ArrowLeftIcon,
    MailIcon,
    RefreshCwIcon,
    SpinnerIcon,
  } from "../icons";

  interface Props {
    onBack: () => void;
    sidebarVisible?: boolean;
  }

  let { onBack, sidebarVisible = true }: Props = $props();

  let composeModalOpen = $state<boolean>(false);
  let threadReaderRef = $state<MailThreadReader | null>(null);

  let customClientId = $state<string>("");
  let customClientSecret = $state<string>("");
  let showAdvancedAuth = $state<boolean>(false);

  onMount(() => {
    const savedId = localStorage.getItem("scratch_gcal_client_id");
    const savedSecret = localStorage.getItem("scratch_gcal_client_secret");
    if (savedId) customClientId = savedId;
    if (savedSecret) customClientSecret = savedSecret;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.getAttribute("contenteditable") === "true";

      if (isInput) return;

      // Single-key navigation shortcuts
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        composeModalOpen = true;
        return;
      }

      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        threadReaderRef?.focusReply();
        return;
      }

      if (e.key === "e" || e.key === "E") {
        if (mailState.selectedThreadId) {
          e.preventDefault();
          void mailState.archiveThread(mailState.selectedThreadId);
        }
        return;
      }

      if (e.key === "#") {
        if (mailState.selectedThreadId) {
          e.preventDefault();
          void mailState.trashThread(mailState.selectedThreadId);
        }
        return;
      }

      if (e.key === "u" || e.key === "U") {
        if (mailState.selectedThreadId) {
          e.preventDefault();
          void mailState.markAsUnread(mailState.selectedThreadId);
        }
        return;
      }

      const threads = mailState.filteredThreads;
      if (threads.length === 0) return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const currentIdx = threads.findIndex((t) => t.id === mailState.selectedThreadId);
        const nextIdx = currentIdx < threads.length - 1 ? currentIdx + 1 : 0;
        void mailState.selectThread(threads[nextIdx].id);
        return;
      }

      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const currentIdx = threads.findIndex((t) => t.id === mailState.selectedThreadId);
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : threads.length - 1;
        void mailState.selectThread(threads[prevIdx].id);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  async function handleConnect() {
    if (!customClientSecret.trim()) {
      showAdvancedAuth = true;
      toast.error(
        "Please enter your Google OAuth Client Secret (starts with GOCSPX-...) before connecting."
      );
      return;
    }
    if (customClientId) localStorage.setItem("scratch_gcal_client_id", customClientId);
    if (customClientSecret) localStorage.setItem("scratch_gcal_client_secret", customClientSecret);

    await mailState.startAuth(customClientId, customClientSecret);
  }

  function handlePointerDown(e: PointerEvent) {
    if (e.button === 0 && !(e.target as HTMLElement)?.closest("button, input, textarea, a, select, kbd")) {
      getCurrentWindow().startDragging();
    }
  }

  async function handleHeaderDoubleClick(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, input, textarea, a, select, kbd")) {
      return;
    }
    const win = getCurrentWindow();
    const isMax = await win.isMaximized();
    if (isMax) {
      await win.unmaximize();
    } else {
      await win.maximize();
    }
  }
</script>

<div class="h-full w-full flex flex-col bg-bg text-text select-none overflow-hidden">
  <!-- Top Braun Header Bar (Standardized to h-11) -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <header
    class={`h-11 border-b border-border bg-bg-secondary flex items-center justify-between shrink-0 z-20 select-none ${
      isMac ? "pl-20 pr-4" : "px-4"
    }`}
    onpointerdown={handlePointerDown}
    ondblclick={handleHeaderDoubleClick}
  >
    <div class="flex items-center gap-3">
      <button
        type="button"
        onclick={onBack}
        class="h-7 px-2.5 rounded-lg border border-border bg-bg hover:bg-bg-emphasis text-text font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
        title="Back to notes (Esc)"
      >
        <ArrowLeftIcon class="w-3.5 h-3.5 stroke-[2]" />
        <span>Notes</span>
      </button>

      <div class="w-px h-4 bg-border/80"></div>

      <div class="flex items-center gap-2">
        <MailIcon class="w-4 h-4 text-accent stroke-[2]" />
        <span class="font-bold text-xs tracking-[0.14em] text-text uppercase">
          MAIL
        </span>
      </div>
    </div>

    <!-- Right Controls -->
    <div class="flex items-center gap-2">
      {#if mailState.connected}
        <button
          type="button"
          onclick={() => mailState.refresh()}
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-text-muted hover:text-text hover:bg-bg transition-colors cursor-pointer"
          title="Sync Now"
        >
          <RefreshCwIcon class={`w-3.5 h-3.5 stroke-[1.8] ${mailState.isSyncing ? "animate-spin" : ""}`} />
          <span>Sync</span>
        </button>
      {/if}
    </div>
  </header>

  <!-- 3-Column Braun Mail Instrument Layout -->
  <div class="flex-1 min-h-0 flex overflow-hidden">
    <!-- Column 1: Mail Folders & Labels (w-48 matching Notes Library) -->
    <div
      data-sidebar
      class={`w-48 shrink-0 border-r border-border bg-bg-secondary flex flex-col overflow-hidden ${
        !sidebarVisible
          ? "!w-0 opacity-0 pointer-events-none border-r-0"
          : "opacity-100"
      }`}
    >
      <MailNavigation onOpenCompose={() => (composeModalOpen = true)} />
    </div>

    <!-- Column 2: Thread List (var(--sidebar-width) matching Notes list) -->
    <div
      data-mail-threads
      style:width={!sidebarVisible ? "0px" : "var(--sidebar-width, 16rem)"}
      class={`shrink-0 border-r border-border bg-bg flex flex-col overflow-hidden relative ${
        !sidebarVisible
          ? "!w-0 opacity-0 pointer-events-none border-r-0"
          : "opacity-100"
      }`}
    >
      <MailThreadList />
    </div>

    <!-- Column 3: Thread Reader & Inline Reply / Disconnected Connect Card -->
    <div class="flex-1 min-w-0 bg-bg flex flex-col overflow-hidden">
      {#if !mailState.connected}
        <!-- Empty / Disconnected State -->
        <div class="flex-1 flex items-center justify-center p-6 bg-bg overflow-y-auto">
          <div class="max-w-md w-full p-8 rounded-2xl bg-bg-secondary border border-border shadow-xl text-center space-y-5">
            <div class="w-12 h-12 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center mx-auto text-accent">
              <MailIcon class="w-6 h-6 stroke-[2]" />
            </div>

            <div>
              <h2 class="text-lg font-bold text-text mb-1">
                Connect Gmail to Scratch
              </h2>
              <p class="text-xs text-text-muted leading-relaxed">
                Read and triage threads, write replies, and manage your inbox with Scratch's Dieter Rams column layout and fast keyboard navigation.
              </p>
            </div>

            {#if showAdvancedAuth}
              <div class="space-y-3 text-left pt-2">
                <div>
                  <label for="gmail-client-id" class="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                    OAuth Client ID
                  </label>
                  <input
                    id="gmail-client-id"
                    type="text"
                    bind:value={customClientId}
                    placeholder="e.g. 688447609926-xxxx.apps.googleusercontent.com"
                    class="w-full px-2.5 py-1.5 rounded-lg bg-bg border border-border font-mono text-xs focus:border-accent focus:outline-none text-text"
                  />
                </div>

                <div>
                  <label for="gmail-client-secret" class="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                    OAuth Client Secret (starts with GOCSPX-)
                  </label>
                  <input
                    id="gmail-client-secret"
                    type="password"
                    bind:value={customClientSecret}
                    placeholder="Paste your Client Secret"
                    class="w-full px-2.5 py-1.5 rounded-lg bg-bg border border-border font-mono text-xs focus:border-accent focus:outline-none text-text"
                  />
                </div>
              </div>
            {/if}

            <div class="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onclick={handleConnect}
                disabled={mailState.isAuthenticating}
                class="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-accent text-slate-950 hover:brightness-105 active:scale-98 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
              >
                {#if mailState.isAuthenticating}
                  <SpinnerIcon class="w-4 h-4 animate-spin stroke-[2]" />
                  <span>Connecting in browser...</span>
                {:else}
                  <MailIcon class="w-4 h-4 stroke-[2]" />
                  <span>Connect Google Account</span>
                {/if}
              </button>

              {#if !showAdvancedAuth}
                <button
                  type="button"
                  onclick={() => (showAdvancedAuth = true)}
                  class="text-[11px] text-text-muted hover:text-text cursor-pointer transition-colors"
                >
                  Configure Custom OAuth Credentials &rarr;
                </button>
              {/if}
            </div>
          </div>
        </div>
      {:else}
        <MailThreadReader bind:this={threadReaderRef} />
      {/if}
    </div>
  </div>

  <!-- New Message Modal Dialog -->
  <MailComposerModal
    bind:open={composeModalOpen}
    onClose={() => (composeModalOpen = false)}
  />
</div>
