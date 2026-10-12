<script lang="ts">
  import { mailState } from "../../context/mail.svelte";
  import {
    ArchiveIcon,
    TrashIcon,
    StarIcon,
    ReplyIcon,
    SendIcon,
    SpinnerIcon,
    EyeIcon,
    MarkdownIcon,
  } from "../icons";

  let viewHtml = $state<boolean>(false);
  let replyText = $state<string>("");
  let replyTextarea = $state<HTMLTextAreaElement | null>(null);

  let thread = $derived(mailState.currentThread);
  let messages = $derived(thread?.messages || []);

  function handleArchive() {
    if (thread) void mailState.archiveThread(thread.id);
  }

  function handleTrash() {
    if (thread) void mailState.trashThread(thread.id);
  }

  function handleToggleStar() {
    if (thread) void mailState.toggleStar(thread.id);
  }

  function handleMarkUnread() {
    if (thread) void mailState.markAsUnread(thread.id);
  }

  async function handleSendReply() {
    if (!thread || !replyText.trim() || mailState.isSending) return;
    const sent = await mailState.sendReply(thread.id, replyText.trim());
    if (sent) {
      replyText = "";
    }
  }

  function handleReplyKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSendReply();
    }
  }

  export function focusReply() {
    if (replyTextarea) {
      replyTextarea.focus();
    }
  }
</script>

<div class="h-full flex flex-col bg-bg text-text select-text overflow-hidden">
  {#if mailState.isLoadingThread}
    <div class="flex-1 flex flex-col items-center justify-center text-text-muted text-xs gap-2">
      <SpinnerIcon class="w-5 h-5 animate-spin stroke-[1.5] text-accent" />
      <span>Loading thread...</span>
    </div>
  {:else if !thread}
    <div class="flex-1 flex flex-col items-center justify-center text-text-muted text-xs p-8 text-center">
      <div class="w-12 h-12 rounded-2xl bg-bg-secondary border border-border flex items-center justify-center mb-3 text-text-muted/50">
        <ReplyIcon class="w-6 h-6 stroke-[1.5]" />
      </div>
      <p class="font-medium text-sm text-text mb-1">No conversation selected</p>
      <p class="text-text-muted/70 max-w-xs text-xs">
        Select an email thread from the list or press <kbd class="px-1.5 py-0.5 rounded bg-bg-muted font-mono text-[10px]">C</kbd> to compose a new message.
      </p>
    </div>
  {:else}
    <!-- Thread Top Action Bar -->
    <div class="h-11 px-4 border-b border-border flex items-center justify-between shrink-0 bg-bg-secondary/40 select-none">
      <!-- Left Quick Actions -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          onclick={handleArchive}
          class="p-1.5 rounded-md hover:bg-bg-muted text-text-muted hover:text-text transition-colors cursor-pointer"
          title="Archive (E)"
        >
          <ArchiveIcon class="w-3.5 h-3.5 stroke-[1.8]" />
        </button>

        <button
          type="button"
          onclick={handleTrash}
          class="p-1.5 rounded-md hover:bg-bg-muted text-text-muted hover:text-red-500 transition-colors cursor-pointer"
          title="Move to Trash (#)"
        >
          <TrashIcon class="w-3.5 h-3.5 stroke-[1.8]" />
        </button>

        <button
          type="button"
          onclick={handleMarkUnread}
          class="px-2 py-1 rounded-md hover:bg-bg-muted text-[11px] font-medium text-text-muted hover:text-text transition-colors cursor-pointer"
          title="Mark Unread (U)"
        >
          Mark Unread
        </button>

        <button
          type="button"
          onclick={handleToggleStar}
          class={`p-1.5 rounded-md hover:bg-bg-muted transition-colors cursor-pointer ${
            thread.starred ? "text-amber-400" : "text-text-muted hover:text-text"
          }`}
          title={thread.starred ? "Unstar" : "Star"}
        >
          <StarIcon class="w-3.5 h-3.5" filled={thread.starred} />
        </button>
      </div>

      <!-- Right View Toggle: Markdown vs Raw HTML -->
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          onclick={() => (viewHtml = !viewHtml)}
          class="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border border-border bg-bg hover:bg-bg-muted text-text-muted hover:text-text transition-colors cursor-pointer"
          title="Toggle between clean Markdown prose and original HTML"
        >
          {#if viewHtml}
            <MarkdownIcon class="w-3.5 h-3.5 stroke-[1.8]" />
            <span>Markdown View</span>
          {:else}
            <EyeIcon class="w-3.5 h-3.5 stroke-[1.8]" />
            <span>HTML View</span>
          {/if}
        </button>
      </div>
    </div>

    <!-- Thread Content Area -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- Subject Header -->
      <div class="border-b border-border pb-4">
        <h1 class="text-xl font-bold text-text tracking-tight mb-2">
          {thread.subject || "(no subject)"}
        </h1>

        <!-- Badges / Labels -->
        <div class="flex flex-wrap items-center gap-1.5">
          {#each thread.labelIds as labelId (labelId)}
            {@const isSys = ["INBOX", "SENT", "STARRED", "UNREAD"].includes(labelId)}
            <span class={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
              isSys
                ? "bg-bg-muted text-text-muted border border-border/80"
                : "bg-accent/15 text-accent font-semibold border border-accent/20"
            }`}>
              {labelId}
            </span>
          {/each}
        </div>
      </div>

      <!-- Messages Chain -->
      <div class="space-y-6">
        {#each messages as msg (msg.id)}
          <div class="rounded-xl border border-border bg-bg-secondary/20 p-5 shadow-2xs">
            <!-- Message Header Row -->
            <div class="flex items-start justify-between gap-4 mb-4">
              <div class="flex items-center gap-3 min-w-0">
                <!-- Avatar circle with initials -->
                <div class="w-8 h-8 rounded-full bg-bg-emphasis border border-border flex items-center justify-center font-bold text-xs text-text shrink-0">
                  {(msg.fromName || msg.from || "?").charAt(0).toUpperCase()}
                </div>

                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-text truncate">
                      {msg.fromName || msg.from}
                    </span>
                    <span class="text-[11px] font-mono text-text-muted/70 truncate">
                      &lt;{msg.from}&gt;
                    </span>
                  </div>
                  <div class="text-[11px] text-text-muted/60 truncate">
                    to {msg.to.join(", ")}
                  </div>
                </div>
              </div>

              <div class="text-[11px] font-mono text-text-muted/70 shrink-0">
                {msg.date}
              </div>
            </div>

            <!-- Message Body -->
            {#if viewHtml && msg.bodyHtml}
              <div class="w-full rounded-lg overflow-hidden border border-border bg-white min-h-64">
                <iframe
                  title="Email Body"
                  sandbox="allow-same-origin"
                  srcdoc={msg.bodyHtml}
                  class="w-full h-96 border-none"
                ></iframe>
              </div>
            {:else}
              <div class="prose prose-neutral max-w-none text-xs text-text/90 leading-relaxed font-sans whitespace-pre-wrap selection:bg-accent/30">
                {msg.bodyMarkdown || msg.snippet}
              </div>
            {/if}

            <!-- Attachments (if any) -->
            {#if msg.attachments && msg.attachments.length > 0}
              <div class="mt-4 pt-3 border-t border-border flex flex-wrap gap-2">
                {#each msg.attachments as att (att.id)}
                  <div class="px-2.5 py-1.5 rounded-lg border border-border bg-bg text-[11px] flex items-center gap-2">
                    <span class="font-medium text-text truncate max-w-48">{att.filename}</span>
                    <span class="font-mono text-text-muted text-[10px]">
                      {Math.round(att.size / 1024)} KB
                    </span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Inline Reply Card -->
      <div class="rounded-xl border border-border bg-bg-secondary/40 p-4 shadow-sm">
        <div class="flex items-center justify-between text-xs font-semibold text-text mb-2">
          <div class="flex items-center gap-1.5">
            <ReplyIcon class="w-3.5 h-3.5 stroke-[1.8] text-accent" />
            <span>Reply to {thread.fromName || thread.from}</span>
          </div>
          <span class="text-[10px] font-mono text-text-muted/60">⌘+Enter to dispatch</span>
        </div>

        <textarea
          bind:this={replyTextarea}
          bind:value={replyText}
          onkeydown={handleReplyKeyDown}
          placeholder="Write a reply..."
          rows="4"
          class="w-full p-3 rounded-lg bg-bg border border-border text-xs text-text placeholder-text-muted/60 focus:outline-none focus:border-accent transition-colors resize-y font-sans leading-relaxed"
        ></textarea>

        <div class="flex items-center justify-between mt-3">
          <span class="text-[10px] text-text-muted/70">
            Plain text / Markdown supported
          </span>

          <div class="flex items-center gap-2">
            {#if replyText.trim()}
              <button
                type="button"
                onclick={() => (replyText = "")}
                class="px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text transition-colors cursor-pointer"
              >
                Clear
              </button>
            {/if}

            <button
              type="button"
              onclick={handleSendReply}
              disabled={!replyText.trim() || mailState.isSending}
              class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-accent text-slate-950 hover:brightness-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
            >
              {#if mailState.isSending}
                <SpinnerIcon class="w-3.5 h-3.5 animate-spin stroke-[2]" />
                <span>Sending...</span>
              {:else}
                <SendIcon class="w-3.5 h-3.5 stroke-[2]" />
                <span>Send Reply</span>
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
