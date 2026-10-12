<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import {
    SpinnerIcon,
    ClaudeIcon,
    CodexIcon,
    OpenCodeIcon,
    OllamaIcon,
  } from "../icons";
  import * as aiService from "../../services/ai";
  import type { AiProvider } from "../../services/ai";
  import type { Settings } from "../../types/note";
  import { modalIn, modalOut, backdropIn, backdropOut } from "../../lib/motion";

  interface Props {
    open: boolean;
    provider: AiProvider;
    onback: () => void;
    onexecute: (prompt: string, ollamaModel?: string) => Promise<void>;
    isExecuting: boolean;
  }

  let {
    open,
    provider,
    onback,
    onexecute,
    isExecuting,
  }: Props = $props();

  let prompt = $state("");
  let cliInstalled = $state<boolean | null>(null);
  let ollamaModel = $state<string>("qwen3:8b");
  let inputEl: HTMLInputElement | null = $state(null);

  let providerName = $derived(
    provider === "codex"
      ? "Codex"
      : provider === "opencode"
        ? "OpenCode"
      : provider === "ollama"
        ? "Ollama"
        : "Claude"
  );

  let cliName = $derived(
    provider === "codex"
      ? "OpenAI Codex CLI"
      : provider === "opencode"
        ? "OpenCode CLI"
      : provider === "ollama"
        ? "Ollama CLI"
        : "Claude Code CLI"
  );

  let installUrl = $derived(
    provider === "codex"
      ? "https://github.com/openai/codex"
      : provider === "opencode"
        ? "https://opencode.ai"
      : provider === "ollama"
        ? "https://ollama.com"
        : "https://code.claude.com/docs/en/quickstart"
  );

  $effect(() => {
    if (open && inputEl && cliInstalled && !isExecuting) {
      inputEl.focus();
    }
  });

  $effect(() => {
    if (!open) return;
    let active = true;
    const checkCli =
      provider === "codex"
        ? aiService.checkCodexCli
        : provider === "opencode"
          ? aiService.checkOpenCodeCli
        : provider === "ollama"
          ? aiService.checkOllamaCli
          : aiService.checkClaudeCli;

    checkCli()
      .then((result) => {
        if (active) cliInstalled = result;
      })
      .catch((err) => {
        console.error(`Failed to check ${cliName}:`, err);
        if (active) cliInstalled = false;
      });

    return () => {
      active = false;
    };
  });

  $effect(() => {
    if (!open || provider !== "ollama") return;
    invoke<Settings>("get_settings")
      .then((settings) => {
        ollamaModel = settings.ollamaModel || "qwen3:8b";
      })
      .catch(() => {});
  });

  $effect(() => {
    if (!open) {
      prompt = "";
      cliInstalled = null;
    }
  });

  $effect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onback();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  });

  async function handleExecute() {
    if (!prompt.trim() || isExecuting || !cliInstalled) return;

    if (provider === "ollama" && ollamaModel.trim()) {
      invoke<Settings>("get_settings")
        .then((settings) =>
          invoke("update_settings", {
            newSettings: { ...settings, ollamaModel: ollamaModel.trim() },
          })
        )
        .catch(() => {});
    }

    await onexecute(
      prompt,
      provider === "ollama" ? ollamaModel.trim() : undefined
    );
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center py-11 px-4 pointer-events-none">
    <!-- Backdrop dismiss area -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      in:backdropIn
      out:backdropOut
      class="fixed inset-0 bg-black/40 pointer-events-auto"
      onclick={onback}
    ></div>

    <!-- Modal -->
    <div
      in:modalIn
      out:modalOut
      class="relative w-full max-w-2xl bg-bg rounded-xl shadow-2xl overflow-hidden border border-border pointer-events-auto z-10"
    >
      <!-- Input -->
      <div class="border-b border-border">
        <div class="flex items-center gap-3 px-4.5 py-3.5">
          {#if provider === "codex"}
            <CodexIcon class="w-5 h-5 text-text-muted" />
          {:else if provider === "opencode"}
            <OpenCodeIcon class="w-5 h-5 text-text-muted" />
          {:else if provider === "ollama"}
            <OllamaIcon class="w-5 h-5 text-text-muted" />
          {:else}
            <ClaudeIcon class="w-5 h-5 text-text-muted" />
          {/if}

          <input
            bind:this={inputEl}
            type="text"
            bind:value={prompt}
            onkeydown={handleKeyDown}
            placeholder={cliInstalled === false
              ? `${cliName} not installed`
              : "Describe how to edit the current note..."}
            disabled={isExecuting || cliInstalled === false}
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck={false}
            class="flex-1 text-[17px] bg-transparent outline-none text-text placeholder:text-text-muted/50 disabled:opacity-50"
          />

          {#if isExecuting}
            <SpinnerIcon class="w-5 h-5 animate-spin text-text-muted shrink-0" />
          {/if}
        </div>
      </div>

      <!-- Instructions -->
      <div class="p-4.5 space-y-3">
        {#if isExecuting}
          <div class="flex items-center gap-2 text-sm text-text-muted">
            <SpinnerIcon class="w-4 h-4 animate-spin" />
            <span>{providerName} is editing your note...</span>
          </div>
        {:else if cliInstalled === false}
          <div class="text-sm space-y-0.5 p-3 bg-orange-500/10 rounded-md">
            <div class="font-medium text-orange-700 dark:text-orange-400">
              {cliName} Not Found
            </div>
            <div class="text-orange-700/80 dark:text-orange-400/80">
              You'll need {cliName} to use this feature. Visit{" "}
              <a
                href={installUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="text-orange-700 dark:text-orange-400 font-medium hover:underline"
              >
                {providerName}
              </a>{" "}
              to install it, then restart Scratch.
            </div>
          </div>
          <div class="w-full flex justify-between">
            <div class="flex items-center gap-1.5 text-sm text-text-muted">
              <kbd class="text-xs px-1.5 py-0.5 rounded-md bg-bg-muted text-text-muted">
                Esc
              </kbd>
              <span>to go back</span>
            </div>
          </div>
        {:else if cliInstalled === null}
          <div class="flex items-center gap-2 text-sm text-text-muted">
            <SpinnerIcon class="w-4 h-4 animate-spin" />
            <span>Checking for {cliName}...</span>
          </div>
        {:else}
          {#if provider === "ollama"}
            <div class="space-y-1.5">
              <div class="flex items-center gap-2 text-sm">
                <span class="text-text-muted shrink-0">Ollama model:</span>
                <input
                  type="text"
                  bind:value={ollamaModel}
                  onkeydown={handleKeyDown}
                  placeholder="qwen3:8b"
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck={false}
                  class="flex-1 text-sm bg-bg-muted rounded-md px-2.5 py-1.5 outline-none text-text placeholder:text-text-muted/50 border border-border focus:border-text-muted transition-colors"
                />
              </div>
            </div>
          {/if}

          <div class="text-sm space-y-1 p-3 bg-bg-muted rounded-md">
            <span class="font-medium text-text">How does it work?</span>{" "}
            <span class="text-text-muted">
              {providerName} will edit the current note directly using your
              local {cliName}. You'll be able to undo changes.
            </span>
          </div>

          <div class="w-full flex justify-between">
            <div class="flex items-center gap-1.5 text-sm text-text-muted">
              <kbd class="text-xs px-1.5 py-0.5 rounded-md bg-bg-muted text-text-muted">
                Esc
              </kbd>
              <span>to go back</span>
            </div>
            <div class="flex items-center gap-1.5 text-sm text-text-muted">
              <kbd class="text-xs px-1.5 py-0.5 rounded-md bg-bg-muted text-text-muted">
                Enter
              </kbd>
              <span>to submit</span>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
