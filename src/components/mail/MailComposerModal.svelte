<script lang="ts">
  import { mailState } from "../../context/mail.svelte";
  import { XIcon, SendIcon, SpinnerIcon } from "../icons";

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open = $bindable(), onClose }: Props = $props();

  let to = $state<string>("");
  let cc = $state<string>("");
  let showCc = $state<boolean>(false);
  let subject = $state<string>("");
  let body = $state<string>("");

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSend();
    }
  }

  async function handleSend() {
    if (!to.trim() || !subject.trim() || !body.trim() || mailState.isSending) return;

    const toList = to
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ccList = cc
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const sent = await mailState.sendNewMail({
      to: toList,
      cc: ccList.length > 0 ? ccList : undefined,
      subject: subject.trim(),
      bodyText: body.trim(),
    });

    if (sent) {
      to = "";
      cc = "";
      subject = "";
      body = "";
      onClose();
    }
  }
</script>

{#if open}
  <div
    role="presentation"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onkeydown={handleKeyDown}
      class="w-full max-w-xl rounded-2xl bg-bg border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="h-12 px-4 border-b border-border flex items-center justify-between shrink-0 bg-bg-secondary">
        <span class="text-xs font-bold uppercase tracking-wider text-text">
          New Message
        </span>

        <button
          type="button"
          onclick={onClose}
          class="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-bg-muted transition-colors cursor-pointer"
          title="Close (Esc)"
        >
          <XIcon class="w-4 h-4 stroke-[2]" />
        </button>
      </div>

      <!-- Form Inputs -->
      <div class="p-4 space-y-3 flex-1 overflow-y-auto">
        <!-- To Row -->
        <div class="flex items-center gap-2 border-b border-border/80 pb-2">
          <label for="compose-to" class="text-xs font-mono text-text-muted w-12 shrink-0">
            To:
          </label>
          <input
            id="compose-to"
            type="text"
            bind:value={to}
            placeholder="recipient@example.com"
            class="flex-1 bg-transparent text-xs text-text placeholder-text-muted/50 focus:outline-none font-sans"
          />
          {#if !showCc}
            <button
              type="button"
              onclick={() => (showCc = true)}
              class="text-[11px] font-mono text-text-muted hover:text-text cursor-pointer px-1.5 py-0.5 rounded hover:bg-bg-muted"
            >
              Cc
            </button>
          {/if}
        </div>

        <!-- Cc Row (if expanded) -->
        {#if showCc}
          <div class="flex items-center gap-2 border-b border-border/80 pb-2">
            <label for="compose-cc" class="text-xs font-mono text-text-muted w-12 shrink-0">
              Cc:
            </label>
            <input
              id="compose-cc"
              type="text"
              bind:value={cc}
              placeholder="colleague@example.com"
              class="flex-1 bg-transparent text-xs text-text placeholder-text-muted/50 focus:outline-none font-sans"
            />
          </div>
        {/if}

        <!-- Subject Row -->
        <div class="flex items-center gap-2 border-b border-border/80 pb-2">
          <label for="compose-subject" class="text-xs font-mono text-text-muted w-12 shrink-0">
            Subject:
          </label>
          <input
            id="compose-subject"
            type="text"
            bind:value={subject}
            placeholder="Subject line"
            class="flex-1 bg-transparent text-xs text-text placeholder-text-muted/50 focus:outline-none font-sans font-medium"
          />
        </div>

        <!-- Body Area -->
        <div class="pt-2">
          <textarea
            bind:value={body}
            placeholder="Write your email here..."
            rows="10"
            class="w-full bg-transparent text-xs text-text placeholder-text-muted/50 focus:outline-none font-sans leading-relaxed resize-y"
          ></textarea>
        </div>
      </div>

      <!-- Footer Action Toolbar -->
      <div class="h-13 px-4 border-t border-border flex items-center justify-between shrink-0 bg-bg-secondary">
        <span class="text-[10px] font-mono text-text-muted/60">
          ⌘+Enter to send
        </span>

        <div class="flex items-center gap-2">
          <button
            type="button"
            onclick={onClose}
            class="px-3.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            Discard
          </button>

          <button
            type="button"
            onclick={handleSend}
            disabled={!to.trim() || !subject.trim() || !body.trim() || mailState.isSending}
            class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-accent text-slate-950 hover:brightness-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
          >
            {#if mailState.isSending}
              <SpinnerIcon class="w-3.5 h-3.5 animate-spin stroke-[2]" />
              <span>Sending...</span>
            {:else}
              <SendIcon class="w-3.5 h-3.5 stroke-[2]" />
              <span>Send</span>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
