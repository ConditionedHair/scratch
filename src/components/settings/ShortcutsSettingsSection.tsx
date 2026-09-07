import { useState, useMemo } from "react";
import { shortcutCategories } from "../../lib/shortcuts";
import { SearchIcon } from "../icons";

// Render individual key as 3D chiclet keycap button
function KeyboardKey({ keyLabel }: { keyLabel: string }) {
  return (
    <kbd className="px-2 py-1 rounded-md bg-bg-card text-text border border-border shadow-keycap text-[11px] font-mono font-bold inline-flex items-center justify-center min-w-6">
      {keyLabel}
    </kbd>
  );
}

// Render shortcut keys
function ShortcutKeys({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1 font-mono">
      {keys.map((key, i) => (
        <KeyboardKey key={i} keyLabel={key} />
      ))}
    </div>
  );
}

const filterCategories = ["ALL", "NAVIGATION", "NOTES", "EDITOR", "SETTINGS"];

export function ShortcutsSettingsSection() {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    return shortcutCategories
      .filter((cat) => cat.title !== "Markdown Syntax")
      .map((cat) => {
        const matchesCategory =
          activeFilter === "ALL" ||
          cat.title.toUpperCase() === activeFilter;

        if (!matchesCategory) return null;

        const filteredShortcuts = cat.shortcuts.filter((s) => {
          if (!searchQuery.trim()) return true;
          const query = searchQuery.toLowerCase();
          return (
            s.description.toLowerCase().includes(query) ||
            s.keys.some((k) => k.toLowerCase().includes(query))
          );
        });

        if (filteredShortcuts.length === 0) return null;

        return {
          ...cat,
          shortcuts: filteredShortcuts,
        };
      })
      .filter(Boolean);
  }, [activeFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-4">
      {/* Header Area */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-border/80 pb-3 gap-3 font-mono">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-text font-sans tracking-wide uppercase">
                KEYBOARD &amp; HARDWARE BUS SHORTCUTS
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 bg-bg-muted text-text-muted rounded font-mono">
                [ MAPPING MATRIX ]
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Configure tactile key combinations, command triggers, and rotary bus shortcuts
            </p>
          </div>

          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-emerald-500 bg-bg px-2.5 py-1 rounded-lg border border-border shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] animate-pulse" />
            <span>ENGINE: TACTILE INTERCEPT</span>
          </div>
        </div>

        {/* Filter Category Tabs & Search Strip */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-bg p-2 rounded-xl border border-border shadow-screen-inset">
          <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
            {filterCategories.map((cat) => {
              const isSelected = activeFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs border border-primary"
                      : "text-text-muted hover:text-text hover:bg-bg-card"
                  }`}
                >
                  [ {cat} ]
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-2 bg-bg-card px-2.5 py-1 rounded-lg border border-border text-text-muted font-mono text-xs">
            <SearchIcon className="w-3.5 h-3.5 text-text-muted/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH KEYCODE..."
              className="bg-transparent text-text placeholder-text-muted/50 text-[11px] outline-none w-36"
            />
          </div>
        </div>
      </div>

      {/* Shortcuts Rack List */}
      <div className="space-y-4">
        {filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-text-muted/60 bg-bg rounded-xl border border-border">
            // NO MATCHING SHORTCUT RECORD FOUND
          </div>
        ) : (
          filteredCategories.map((category) => {
            if (!category) return null;
            return (
              <div key={category.title} className="space-y-2">
                <div className="text-[10px] font-mono font-bold tracking-widest text-text-muted uppercase px-1">
                  // {category.title}
                </div>

                <div className="space-y-1.5">
                  {category.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-bg border border-border hover:border-border/80 transition-all gap-2.5 shadow-screen-inset"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
                        <div>
                          <span className="text-xs font-semibold text-text font-mono tracking-tight">
                            {shortcut.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 justify-end self-end sm:self-auto">
                        <ShortcutKeys keys={shortcut.keys} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
