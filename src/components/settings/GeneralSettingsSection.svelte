<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { toast } from "svelte-sonner";
  import { notesState } from "../../context/notes.svelte";
  import { themeState } from "../../context/theme.svelte";
  import { gitState } from "../../context/git.svelte";
  import { isMac } from "../../lib/platform";
  import { Button, Input } from "../ui";
  import {
    FolderIcon,
    FoldersIcon,
    ExternalLinkIcon,
    SpinnerIcon,
    CloudPlusIcon,
    ChevronRightIcon,
  } from "../icons";
  import FoldersToggle from "./FoldersToggle.svelte";
  import IcloudSection from "./IcloudSection.svelte";
  import IgnoredFoldersEditor from "./IgnoredFoldersEditor.svelte";
  import type { Settings } from "../../types/note";

  // Format remote URL for display - extract user/repo from full URL
  function formatRemoteUrl(url: string | null): string {
    if (!url) return "Connected";
    const sshMatch = url.match(/:([^/]+\/[^/]+?)(?:\.git)?$/);
    const httpsMatch = url.match(/\/([^/]+\/[^/]+?)(?:\.git)?$/);
    return sshMatch?.[1] || httpsMatch?.[1] || url;
  }

  // Convert git remote URL to a browsable web URL
  function getRemoteWebUrl(url: string | null): string | null {
    if (!url) return null;
    const sshMatch = url.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
    if (sshMatch) {
      return `https://${sshMatch[1]}/${sshMatch[2]}`;
    }
    const httpsMatch = url.match(/^(https?:\/\/.+?)(?:\.git)?$/);
    if (httpsMatch) {
      return httpsMatch[1];
    }
    return null;
  }

  // Format path for display - truncate middle if too long
  function formatPath(path: string | null): string {
    if (!path) return "Not set";
    const maxLength = 50;
    if (path.length <= maxLength) return path;
    const start = path.slice(0, 20);
    const end = path.slice(-25);
    return `${start}...${end}`;
  }

  let remoteUrl = $state("");
  let showRemoteInput = $state(false);
  let isEditingRemote = $state(false);
  let noteTemplate = $state("Untitled");
  let previewNoteName = $state("Untitled");

  onMount(() => {
    invoke<Settings>("get_settings")
      .then(async (settings) => {
        const template = settings.defaultNoteName || "Untitled";
        noteTemplate = template;
        try {
          const preview = await invoke<string>("preview_note_name", { template });
          previewNoteName = preview;
        } catch {
          previewNoteName = "Invalid template";
        }
      })
      .catch((error) => {
        console.error("Failed to load template:", error);
      });
  });

  $effect(() => {
    const template = noteTemplate;
    const timer = setTimeout(async () => {
      try {
        const preview = await invoke<string>("preview_note_name", {
          template,
        });
        previewNoteName = preview;
      } catch {
        previewNoteName = "Invalid template";
      }
    }, 300);

    return () => clearTimeout(timer);
  });

  async function handleSaveTemplate() {
    try {
      const settings = await invoke<Settings>("get_settings");
      await invoke("update_settings", {
        newSettings: {
          ...settings,
          defaultNoteName: noteTemplate || undefined,
        },
      });
      toast.success("Default name saved");
    } catch (error) {
      console.error("Failed to save default name:", error);
      toast.error("Failed to save default name");
    }
  }

  async function handleChangeFolder() {
    try {
      const selected = await invoke<string | null>("open_folder_dialog", {
        defaultPath: notesState.notesFolder || null,
      });

      if (selected) {
        await notesState.setNotesFolder(selected);
        await themeState.reloadSettings();
      }
    } catch (err) {
      console.error("Failed to select folder:", err);
      toast.error("Failed to select folder");
    }
  }

  async function handleOpenFolder() {
    if (!notesState.notesFolder) return;
    try {
      await invoke("open_in_file_manager", { path: notesState.notesFolder });
    } catch (err) {
      console.error("Failed to open folder:", err);
      toast.error("Failed to open folder");
    }
  }

  async function handleOpenUrl(url: string) {
    try {
      await invoke("open_url_safe", { url });
    } catch (err) {
      console.error("Failed to open URL:", err);
      toast.error(err instanceof Error ? err.message : "Failed to open URL");
    }
  }

  async function handleAddRemote() {
    if (gitState.isAddingRemote) return;
    if (!remoteUrl.trim()) return;
    const success = await gitState.addRemote(remoteUrl.trim());
    if (success) {
      remoteUrl = "";
      showRemoteInput = false;
    }
  }

  function handleStartEditRemote() {
    remoteUrl = gitState.status?.remoteUrl || "";
    isEditingRemote = true;
    gitState.clearError();
  }

  function handleCancelEditRemote() {
    isEditingRemote = false;
    remoteUrl = "";
    gitState.clearError();
  }

  async function handleSaveRemoteUrl() {
    if (gitState.isAddingRemote) return;
    const trimmed = remoteUrl.trim();
    if (!trimmed) return;
    if (trimmed === gitState.status?.remoteUrl) {
      isEditingRemote = false;
      return;
    }
    const success = await gitState.setRemoteUrl(trimmed);
    if (success) {
      remoteUrl = "";
      isEditingRemote = false;
    }
  }

  async function handleRemoveRemote() {
    if (gitState.isAddingRemote) return;
    const success = await gitState.removeRemote();
    if (success) {
      remoteUrl = "";
      isEditingRemote = false;
    }
  }

  async function handlePushWithUpstream() {
    await gitState.pushWithUpstream();
  }

  function handleCancelRemote() {
    showRemoteInput = false;
    remoteUrl = "";
    gitState.clearError();
  }

  async function handleToggleGitEnabled(enabled: boolean) {
    if (gitState.isUpdatingGitEnabled) return;

    const success = await gitState.setGitEnabled(enabled);
    if (!success) {
      toast.error("Failed to update version control setting");
      return;
    }

    if (!enabled) {
      showRemoteInput = false;
      isEditingRemote = false;
      remoteUrl = "";
    }
  }
</script>

{#snippet remoteInstructions()}
  <div class="text-sm text-text-muted space-y-1.5 pt-2 pb-1.5">
    <p class="font-medium">To get your remote URL:</p>
    <ol class="list-decimal list-inside space-y-0.5 pl-1">
      <li>Create a repository on GitHub, GitLab, etc.</li>
      <li>Copy the repository URL (HTTPS or SSH)</li>
      <li>Click "Add Remote" and paste the URL</li>
    </ol>
    <p class="text-text-muted/70 pt-1">
      Example: https://github.com/username/my-notes.git
    </p>
  </div>
{/snippet}

<div class="space-y-8 py-8">
  <!-- Folder Location -->
  <section class="pb-2">
    <h2 class="text-xl font-medium mb-0.5">Folder Location</h2>
    <p class="text-sm text-text-muted mb-4">
      Your notes are stored as markdown files in this folder
    </p>
    <div class="flex items-center gap-2.5 p-2.5 rounded-[10px] border border-border mb-2.5">
      <div class="p-2 rounded-md bg-bg-muted">
        <FolderIcon class="w-4.5 h-4.5 stroke-[1.5] text-text-muted" />
      </div>
      <p
        class="text-sm text-text-muted truncate"
        title={notesState.notesFolder || undefined}
      >
        {formatPath(notesState.notesFolder)}
      </p>
    </div>
    <div class="flex items-center gap-1">
      <Button
        onclick={handleChangeFolder}
        variant="outline"
        size="md"
        class="gap-1.25"
      >
        <FoldersIcon class="w-4.5 h-4.5 stroke-[1.5]" />
        Change Folder
      </Button>
      {#if notesState.notesFolder}
        <Button
          onclick={handleOpenFolder}
          variant="ghost"
          size="md"
          class="gap-1.25 text-text"
        >
          Open Folder
        </Button>
      {/if}
    </div>
    {#if isMac}
      <IcloudSection />
    {/if}
  </section>

  <!-- Divider -->
  <div class="border-t border-border border-dashed"></div>

  <!-- Folders Section -->
  <section class="pb-2">
    <div class="flex items-center justify-between gap-6">
      <div class="flex flex-col gap-0.75">
        <div class="flex items-center gap-2">
          <h2 class="text-xl font-medium">Enable Folders</h2>
        </div>
        <p class="text-sm text-text-muted max-w-lg">
          Create and view nested folders to organize your notes. When off,
          notes are shown in a flat list sorted by date.
        </p>
      </div>
      <FoldersToggle />
    </div>
  </section>

  <!-- Divider -->
  <div class="border-t border-border border-dashed"></div>

  <!-- Git Section -->
  <section class="pb-2 flex flex-col gap-4">
    <div class="flex items-center justify-between gap-6">
      <div class="flex flex-col gap-0.75">
        <h2 class="text-xl font-medium">Version Control</h2>
        <p class="text-sm text-text-muted max-w-lg">
          Track changes and store backups of your notes using Git
        </p>
      </div>
      <div class="flex gap-1 p-1 rounded-[10px] border border-border">
        <Button
          onclick={() => handleToggleGitEnabled(false)}
          variant={!gitState.gitEnabled ? "primary" : "ghost"}
          size="xs"
          disabled={gitState.isUpdatingGitEnabled}
        >
          Off
        </Button>
        <Button
          onclick={() => handleToggleGitEnabled(true)}
          variant={gitState.gitEnabled ? "primary" : "ghost"}
          size="xs"
          disabled={gitState.isUpdatingGitEnabled}
        >
          On
        </Button>
      </div>
    </div>
    {#if gitState.gitEnabled}
      {#if !gitState.gitAvailable}
        <div class="bg-bg-secondary rounded-[10px] border border-border p-4">
          <p class="text-sm text-text-muted">
            Git is not available on this system.{" "}
            <a
              href="https://git-scm.com/downloads"
              target="_blank"
              rel="noopener noreferrer"
              class="text-text-muted border-b border-text-muted/50 hover:text-text hover:border-text cursor-pointer transition-colors"
            >
              Install Git
            </a>{" "}
            to enable version control.
          </p>
        </div>
      {:else if gitState.isLoading}
        <div class="rounded-[10px] border border-border p-4 flex items-center justify-center">
          <SpinnerIcon class="w-4.5 h-4.5 stroke-[1.5] animate-spin text-text-muted" />
        </div>
      {:else if !gitState.status?.isRepo}
        <div class="bg-bg-secondary rounded-[10px] border border-border p-4">
          <p class="text-sm text-text-muted mb-2">
            Enable Git to track changes to your notes with version control.
            Your changes will be tracked automatically and you can commit and
            push from the sidebar.
          </p>
          <Button
            onclick={() => gitState.initRepo()}
            disabled={gitState.isLoading}
            variant="outline"
            size="md"
          >
            Initialize Git Repository
          </Button>
        </div>
      {:else}
        <div class="rounded-[10px] border border-border p-4 space-y-2.5">
          <!-- Branch status -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-text font-medium">Status</span>
            <span class="text-sm text-text-muted">
              {gitState.status.currentBranch
                ? `On branch ${gitState.status.currentBranch}`
                : "Git enabled"}
            </span>
          </div>

          <!-- Remote configuration -->
          {#if gitState.status.hasRemote}
            {#if isEditingRemote}
              <div class="space-y-2">
                <span class="text-sm text-text font-medium">Remote</span>
                <Input
                  type="text"
                  bind:value={remoteUrl}
                  onkeydown={(e) => {
                    if (e.key === "Enter") handleSaveRemoteUrl();
                    if (e.key === "Escape") handleCancelEditRemote();
                  }}
                  placeholder="https://github.com/user/repo.git"
                  autofocus
                />
                <div class="flex gap-2">
                  <Button
                    onclick={handleSaveRemoteUrl}
                    disabled={
                      gitState.isAddingRemote ||
                      !remoteUrl.trim() ||
                      remoteUrl.trim() === gitState.status.remoteUrl
                    }
                    size="sm"
                  >
                    {#if gitState.isAddingRemote}
                      <SpinnerIcon class="w-3 h-3 mr-2 animate-spin" />
                      Saving...
                    {:else}
                      Save
                    {/if}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={handleCancelEditRemote}
                    disabled={gitState.isAddingRemote}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onclick={handleRemoveRemote}
                    disabled={gitState.isAddingRemote}
                    class="ml-auto text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    Remove
                  </Button>
                </div>
                {@render remoteInstructions()}
              </div>
            {:else}
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm text-text font-medium">Remote</span>
                <div class="flex items-center gap-2 min-w-0">
                  {#if getRemoteWebUrl(gitState.status.remoteUrl)}
                    <button
                      onclick={() =>
                        handleOpenUrl(getRemoteWebUrl(gitState.status?.remoteUrl ?? null)!)}
                      class="flex items-center gap-0.75 text-sm text-text-muted hover:text-text truncate max-w-50 transition-colors cursor-pointer"
                      title={gitState.status.remoteUrl || undefined}
                    >
                      <span class="truncate">
                        {formatRemoteUrl(gitState.status.remoteUrl)}
                      </span>
                      <ExternalLinkIcon class="w-3.25 h-3.25 shrink-0" />
                    </button>
                  {:else}
                    <span
                      class="text-sm text-text-muted truncate max-w-50"
                      title={gitState.status.remoteUrl || undefined}
                    >
                      {formatRemoteUrl(gitState.status.remoteUrl)}
                    </span>
                  {/if}
                  <button
                    type="button"
                    onclick={handleStartEditRemote}
                    class="text-sm text-text font-medium hover:text-text-muted transition-colors cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              </div>
            {/if}

            <!-- Upstream tracking status -->
            {#if gitState.status.hasUpstream}
              <div class="flex items-center justify-between">
                <span class="text-sm text-text font-medium">Tracking</span>
                <span class="text-sm text-text-muted">
                  origin/{gitState.status.currentBranch}
                </span>
              </div>
            {:else if gitState.status.currentBranch}
              <div class="pt-3 border-t border-border border-dashed space-y-0.5">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-text font-medium">Tracking</span>
                  <span class="text-sm font-medium text-amber-500">
                    Not set up
                  </span>
                </div>
                <p class="text-sm text-text-muted mb-2">
                  Push your commits and set up tracking for the '{gitState.status.currentBranch}' branch.
                </p>
                <Button
                  onclick={handlePushWithUpstream}
                  disabled={gitState.isPushing}
                  size="sm"
                  class="mb-1.5"
                >
                  {#if gitState.isPushing}
                    <SpinnerIcon class="w-3.25 h-3.25 mr-2 animate-spin" />
                    Pushing...
                  {:else}
                    Push & track '{gitState.status.currentBranch}'
                  {/if}
                </Button>
              </div>
            {/if}
          {:else}
            <div class="pt-3 border-t border-border border-dashed space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-sm text-text font-medium">Remote</span>
                <span class="text-sm font-medium text-red-500">
                  Not connected
                </span>
              </div>

              {#if showRemoteInput}
                <div class="space-y-2">
                  <Input
                    type="text"
                    bind:value={remoteUrl}
                    onkeydown={(e) => {
                      if (e.key === "Enter") handleAddRemote();
                      if (e.key === "Escape") handleCancelRemote();
                    }}
                    placeholder="https://github.com/user/repo.git"
                    autofocus
                  />
                  <div class="flex gap-2">
                    <Button
                      onclick={handleAddRemote}
                      disabled={gitState.isAddingRemote || !remoteUrl.trim()}
                      size="sm"
                    >
                      {#if gitState.isAddingRemote}
                        <SpinnerIcon class="w-3 h-3 mr-2 animate-spin" />
                        Connecting...
                      {:else}
                        Connect
                      {/if}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onclick={handleCancelRemote}
                    >
                      Cancel
                    </Button>
                  </div>
                  {@render remoteInstructions()}
                </div>
              {:else}
                <Button
                  onclick={() => { showRemoteInput = true; }}
                  variant="outline"
                  size="md"
                >
                  <CloudPlusIcon class="w-4 h-4 stroke-[1.7] mr-1.5" />
                  Add Remote
                </Button>
                {@render remoteInstructions()}
              {/if}
            </div>
          {/if}

          <!-- Stats or Error -->
          {#if gitState.lastError}
            <div class="flex items-center justify-between pt-3 border-t border-border border-dashed">
              <span class="text-sm text-text font-medium">Status</span>
              <span class="text-sm text-text-muted">An error occurred</span>
            </div>
          {:else}
            {#if gitState.status.changedCount > 0}
              <div class="flex items-center justify-between pt-3 border-t border-border border-dashed">
                <span class="text-sm text-text font-medium">Changes to commit</span>
                <span class="text-sm text-text-muted">
                  {gitState.status.changedCount} file{gitState.status.changedCount === 1 ? "" : "s"} changed
                </span>
              </div>
            {/if}

            {#if gitState.status.aheadCount > 0 && gitState.status.hasUpstream}
              <div class="flex items-center justify-between">
                <span class="text-sm text-text font-medium">Commits to push</span>
                <span class="text-sm text-text-muted">
                  {gitState.status.aheadCount} commit{gitState.status.aheadCount === 1 ? "" : "s"}
                </span>
              </div>
            {/if}

            {#if gitState.status.behindCount > 0 && gitState.status.hasUpstream}
              <div class="flex items-center justify-between">
                <span class="text-sm text-text font-medium">Commits to pull</span>
                <span class="text-sm text-text-muted">
                  {gitState.status.behindCount} commit{gitState.status.behindCount === 1 ? "" : "s"}
                </span>
              </div>
            {/if}
          {/if}

          <!-- Error display -->
          {#if gitState.lastError}
            <div class="pt-3 border-t border-border">
              <div class="bg-red-500/10 rounded-md p-3">
                <p class="text-sm text-red-500 first-letter:capitalize">
                  {gitState.lastError}
                </p>
                {#if gitState.lastError.includes("Authentication") || gitState.lastError.includes("SSH")}
                  <a
                    href="https://docs.github.com/en/authentication/connecting-to-github-with-ssh"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm text-red-500 hover:text-red-600 underline font-medium mt-1 inline-block"
                  >
                    Learn more about SSH authentication
                  </a>
                {/if}
                <Button
                  onclick={() => gitState.clearError()}
                  variant="link"
                  class="block text-sm h-auto p-0 mt-2 text-red-500 hover:text-red-600 font-medium"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  </section>

  <!-- Divider -->
  <div class="border-t border-border border-dashed"></div>

  <!-- New Note Template -->
  <section class="pb-2">
    <h2 class="text-xl font-medium mb-0.5">Default Note Name</h2>
    <p class="text-sm text-text-muted mb-4">
      Customize the default name when creating a new note
    </p>

    <div class="space-y-2">
      <div>
        <Input
          type="text"
          bind:value={noteTemplate}
          onblur={handleSaveTemplate}
          placeholder="Untitled"
        />
      </div>
      <div class="text-2xs text-text-muted font-mono p-2 rounded-md bg-bg-muted mb-4">
        Preview: {previewNoteName}
      </div>

      <!-- Template Tags Reference -->
      <details class="text-sm">
        <summary class="cursor-pointer text-text-muted hover:text-text select-none flex items-center gap-1 font-medium">
          <ChevronRightIcon class="w-3.5 h-3.5 stroke-2 transition-transform [[open]>&]:rotate-90" />
          Add template tags to your name
        </summary>
        <div class="mt-2 space-y-1.5 pl-2 text-text-muted">
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
            <code>{"{timestamp}"}</code>
            <span>1739586000</span>
            <code>{"{date}"}</code>
            <span>2026-02-15</span>
            <code>{"{time}"}</code>
            <span>14-30-45</span>
            <code>{"{year}"}</code>
            <span>2026</span>
            <code>{"{month}"}</code>
            <span>02</span>
            <code>{"{day}"}</code>
            <span>15</span>
            <code>{"{monthName}"}</code>
            <span>February</span>
            <code>{"{monthShort}"}</code>
            <span>Feb</span>
            <code>{"{weekday}"}</code>
            <span>Sunday</span>
            <code>{"{weekdayShort}"}</code>
            <span>Sun</span>
            <code>{"{dayOrdinal}"}</code>
            <span>15th</span>
            <code>{"{counter}"}</code>
            <span>1, 2, 3...</span>
          </div>
          <p class="text-xs mt-2 pt-2 border-t border-border">
            Examples: <code>Note-{"{year}-{month}-{day}"}</code>
          </p>
        </div>
      </details>
    </div>
  </section>

  <!-- Divider -->
  <div class="border-t border-border border-dashed"></div>

  <!-- Ignored Folders -->
  <section class="pb-2">
    <h2 class="text-xl font-medium mb-0.5">Ignored Folders</h2>
    <p class="text-sm text-text-muted mb-4">
      Folders matching these names are excluded from note discovery and
      search indexing
    </p>
    <IgnoredFoldersEditor />
  </section>
</div>
