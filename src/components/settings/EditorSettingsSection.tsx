import { useTheme, defaultThemeColors } from "../../context/ThemeContext";
import { Button, Input, Select } from "../ui";
import { ColorPicker } from "../ui/ColorPicker";
import type {
  FontFamily,
  TextDirection,
  EditorWidth,
  ThemeColorKey,
} from "../../types/note";
import { ChevronRightIcon, EyeIcon, MinusIcon, PlusIcon } from "../icons";
import { cn } from "../../lib/utils";

// Human-readable labels for theme color keys, grouped logically
const colorLabels: { key: ThemeColorKey; label: string; group: string }[] = [
  // Surfaces
  { key: "bg", label: "Background", group: "Surfaces" },
  { key: "bg-secondary", label: "Sidebar", group: "Surfaces" },
  { key: "bg-muted", label: "Hover & Subtle Fill", group: "Surfaces" },
  { key: "bg-emphasis", label: "Strong Fill", group: "Surfaces" },
  // Text & UI
  { key: "text", label: "Text", group: "Text & UI" },
  { key: "text-muted", label: "Secondary Text", group: "Text & UI" },
  { key: "accent", label: "Primary & Buttons", group: "Text & UI" },
  { key: "border", label: "Borders", group: "Text & UI" },
  { key: "selection", label: "Selection Highlight", group: "Text & UI" },
];

// Text direction options
const textDirectionOptions: { value: TextDirection; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "ltr", label: "LTR" },
  { value: "rtl", label: "RTL" },
];

// Page width options
const editorWidthOptions: { value: EditorWidth; label: string }[] = [
  { value: "narrow", label: "Narrow" },
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Wide" },
  { value: "full", label: "Full" },
  { value: "custom", label: "Custom" },
];

// Bold weight options (medium excluded for monospace)
const boldWeightOptions = [
  { value: 500, label: "Medium", excludeForMonospace: true },
  { value: 600, label: "Semibold", excludeForMonospace: false },
  { value: 700, label: "Bold", excludeForMonospace: false },
  { value: 800, label: "Extra Bold", excludeForMonospace: false },
];

export function AppearanceSettingsSection() {
  const {
    theme,
    resolvedTheme,
    setTheme,
    editorFontSettings,
    setEditorFontSetting,
    resetEditorFontSettings,
    textDirection,
    setTextDirection,
    editorWidth,
    setEditorWidth,
    interfaceZoom,
    setInterfaceZoom,
    customEditorWidthPx,
    setCustomEditorWidthPx,
    customColorsLight,
    customColorsDark,
    setCustomColor,
    resetCustomColor,
    resetAllCustomColors,
  } = useTheme();

  // Check if settings differ from defaults
  const hasCustomFonts =
    editorFontSettings.baseFontFamily !== "system-sans" ||
    editorFontSettings.baseFontSize !== 15 ||
    editorFontSettings.boldWeight !== 600 ||
    editorFontSettings.lineHeight !== 1.6 ||
    textDirection !== "auto" ||
    editorWidth !== "normal" ||
    Math.round(interfaceZoom * 100) !== 100;

  // Filter weight options based on font family
  const isMonospace = editorFontSettings.baseFontFamily === "monospace";
  const availableWeightOptions = boldWeightOptions.filter(
    (opt) => !isMonospace || !opt.excludeForMonospace,
  );

  // Handle font family change - bump up weight if needed
  const handleFontFamilyChange = (newFamily: FontFamily) => {
    setEditorFontSetting("baseFontFamily", newFamily);
    // If switching to monospace and current weight is medium, bump to semibold
    if (newFamily === "monospace" && editorFontSettings.boldWeight === 500) {
      setEditorFontSetting("boldWeight", 600);
    }
  };

  return (
    <div className="space-y-7 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/80 pb-3 gap-2 font-mono">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-text font-sans tracking-wide uppercase">
              CHASSIS &amp; DISPLAY CALIBRATION
            </h2>
            <span className="text-[10px] px-1.5 py-0.5 bg-bg-muted text-text-muted rounded font-mono">
              [ THEME &amp; MATRIX ]
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Configure chassis enclosure finish, typography rendering, and optical contrast levels
          </p>
        </div>
        <div className="text-[10px] text-emerald-500 tracking-wider font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
          <span>OPTICAL MATRIX: ACTIVE</span>
        </div>
      </div>

      {/* MODULE A: Hardware Chassis Enclosure Finish */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-border/70 font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-text uppercase tracking-wider">
              HARDWARE CHASSIS ENCLOSURE
            </span>
            <span className="text-[9px] text-text-muted">[ PHYSICAL FINISH ]</span>
          </div>
          <span className="text-[10px] text-text-muted">CALIBRATION BUS 01</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Finish 1: Dark Slate */}
          <div
            onClick={() => setTheme("dark")}
            role="button"
            tabIndex={0}
            className={`p-3.5 rounded-xl bg-bg border-2 transition-all flex flex-col justify-between space-y-3 cursor-pointer shadow-screen-inset ${
              theme === "dark"
                ? "border-primary shadow-sm"
                : "border-border hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#121315] border border-neutral-600 flex items-center justify-center">
                  {theme === "dark" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-xs font-semibold text-text font-mono tracking-wide">
                  MATTE SLATE
                </span>
              </div>
              <span
                className={`w-2 h-2 rounded-full ${
                  theme === "dark"
                    ? "bg-primary shadow-[0_0_8px_var(--color-primary)]"
                    : "bg-border"
                }`}
              />
            </div>
            <div className="h-10 w-full rounded-lg bg-[#121315] border border-[#2b2d38] p-2 flex items-center justify-between">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded bg-[#1f2025] border border-neutral-700" />
                <div className="w-3 h-3 rounded bg-primary" />
                <div className="w-3 h-3 rounded bg-emerald-500" />
              </div>
              <span className="text-[9px] font-mono text-neutral-400">#121315 OLED</span>
            </div>
            <p className="text-[10px] text-text-muted font-mono leading-relaxed">
              High-contrast dark OLED emission // TE-Field Spec
            </p>
          </div>

          {/* Finish 2: Light Sand */}
          <div
            onClick={() => setTheme("light")}
            role="button"
            tabIndex={0}
            className={`p-3.5 rounded-xl bg-bg border-2 transition-all flex flex-col justify-between space-y-3 cursor-pointer shadow-screen-inset ${
              theme === "light"
                ? "border-primary shadow-sm"
                : "border-border hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#FAF8F4] border border-neutral-400 flex items-center justify-center">
                  {theme === "light" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-xs font-semibold text-text font-mono tracking-wide">
                  ANODIZED STONE
                </span>
              </div>
              <span
                className={`w-2 h-2 rounded-full ${
                  theme === "light"
                    ? "bg-primary shadow-[0_0_8px_var(--color-primary)]"
                    : "bg-border"
                }`}
              />
            </div>
            <div className="h-10 w-full rounded-lg bg-[#FAF8F4] border border-[#DDD9CF] p-2 flex items-center justify-between text-neutral-800">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded bg-[#2a2b32]" />
                <div className="w-3 h-3 rounded bg-primary" />
                <div className="w-3 h-3 rounded bg-[#9e9a90]" />
              </div>
              <span className="text-[9px] font-mono text-neutral-800 font-bold">#FAF8F4 RAMS</span>
            </div>
            <p className="text-[10px] text-text-muted font-mono leading-relaxed">
              Daylight reflective matte chassis // Dieter Rams Spec
            </p>
          </div>

          {/* Finish 3: System Auto */}
          <div
            onClick={() => setTheme("system")}
            role="button"
            tabIndex={0}
            className={`p-3.5 rounded-xl bg-bg border-2 transition-all flex flex-col justify-between space-y-3 cursor-pointer shadow-screen-inset ${
              theme === "system"
                ? "border-primary shadow-sm"
                : "border-border hover:border-border/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3.5 h-3.5 rounded-full bg-bg-card border border-emerald-500 flex items-center justify-center">
                  {theme === "system" && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>
                <span className="text-xs font-semibold text-text font-mono tracking-wide">
                  PHOTO-SENSOR
                </span>
              </div>
              <span
                className={`w-2 h-2 rounded-full ${
                  theme === "system"
                    ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                    : "bg-border"
                }`}
              />
            </div>
            <div className="h-10 w-full rounded-lg bg-bg-card border border-border p-2 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <EyeIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[9px] font-mono text-text">AUTO SENSOR</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-500 font-semibold">AUTO LUX</span>
            </div>
            <p className="text-[10px] text-text-muted font-mono leading-relaxed">
              Synchronize chassis finish with OS ambient light sensor
            </p>
          </div>
        </div>

        {/* Customize Colors */}
        {theme === "system" ? (
          <div className="mt-3 space-y-2">
            <ColorsExpandable
              label="Customize light colors"
              mode="light"
              customColors={customColorsLight}
              setCustomColor={setCustomColor}
              resetCustomColor={resetCustomColor}
              resetAllCustomColors={resetAllCustomColors}
            />
            <ColorsExpandable
              label="Customize dark colors"
              mode="dark"
              customColors={customColorsDark}
              setCustomColor={setCustomColor}
              resetCustomColor={resetCustomColor}
              resetAllCustomColors={resetAllCustomColors}
            />
          </div>
        ) : (
          <ColorsExpandable
            label="Customize colors"
            mode={resolvedTheme}
            customColors={
              resolvedTheme === "dark" ? customColorsDark : customColorsLight
            }
            setCustomColor={setCustomColor}
            resetCustomColor={resetCustomColor}
            resetAllCustomColors={resetAllCustomColors}
            className="mt-3"
          />
        )}
      </div>

      {/* MODULE B: Optical Typography & Engine */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between pb-1 border-b border-border/70 font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-text uppercase tracking-wider">
              OPTICAL TYPOGRAPHY &amp; CRT MATRIX
            </span>
            <span className="text-[9px] text-text-muted">[ ENGINE CORE ]</span>
          </div>
          {hasCustomFonts && (
            <button
              onClick={resetEditorFontSettings}
              className="text-[10px] font-mono text-primary hover:underline cursor-pointer"
            >
              [ RESET DEFAULTS ]
            </button>
          )}
        </div>

        <div className="space-y-3 bg-bg border border-border rounded-xl p-4 lg:p-5 shadow-screen-inset">
          {/* Typography Scale Steps */}
          <div className="space-y-2">
            <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">
              Typography Scale Step
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { size: 12, label: "[ 12PT COMPACT ]" },
                { size: 14, label: "[ 14PT STANDARD ]" },
                { size: 16, label: "[ 16PT COMFORT ]" },
                { size: 18, label: "[ 18PT DISPLAY ]" },
              ].map((step) => {
                const isSelected = editorFontSettings.baseFontSize === step.size;
                return (
                  <button
                    key={step.size}
                    type="button"
                    onClick={() => setEditorFontSetting("baseFontSize", step.size)}
                    className={`py-2 px-2.5 rounded-lg text-[11px] font-mono transition-all text-center cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold shadow-md border border-primary"
                        : "bg-bg-card hover:bg-bg-emphasis border border-border text-text-muted hover:text-text shadow-keycap"
                    }`}
                  >
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Engine Architecture */}
          <div className="space-y-2 pt-2 border-t border-border/70">
            <span className="text-[11px] text-text-muted font-mono uppercase tracking-wider">
              Font Engine Architecture
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: "system-sans",
                  name: "SPACE GROTESK",
                  sub: "(MONO HEADERS)",
                },
                {
                  id: "serif",
                  name: "EDITORIAL SERIF",
                  sub: "(CLASSIC PRINT)",
                },
                {
                  id: "monospace",
                  name: "JETBRAINS MONO",
                  sub: "(TELETYPE RAW)",
                },
              ].map((f) => {
                const isActive = editorFontSettings.baseFontFamily === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleFontFamilyChange(f.id as FontFamily)}
                    className={`p-2.5 rounded-lg text-left transition-all cursor-pointer ${
                      isActive
                        ? "bg-bg-card border-l-4 border-l-primary border-y border-r border-border shadow-xs"
                        : "bg-bg-card/70 hover:bg-bg-card border border-border/80 text-text-muted hover:text-text"
                    }`}
                  >
                    <div className="text-xs font-semibold text-text font-mono">
                      {f.name}
                    </div>
                    <div
                      className={`text-[9px] font-mono ${
                        isActive ? "text-primary font-bold" : "text-text-muted"
                      }`}
                    >
                      {f.sub} {isActive ? "[ACTIVE]" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bold Weight Selection */}
          <div className="space-y-2 pt-2 border-t border-border/70 font-mono">
            <span className="text-[11px] text-text-muted uppercase tracking-wider">
              Font Boldness Weight
            </span>
            <div className="flex flex-wrap gap-2">
              {availableWeightOptions.map((opt) => {
                const isSelected = editorFontSettings.boldWeight === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditorFontSetting("boldWeight", opt.value)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold shadow-md border border-primary"
                        : "bg-bg-card hover:bg-bg-emphasis border border-border text-text-muted hover:text-text shadow-keycap"
                    }`}
                  >
                    {opt.label} ({opt.value})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Line Height & Width Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/70 font-mono">
            {/* Line Height */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-text">
                  Line Height / Raster Pitch
                </div>
                <div className="text-[10px] text-text-muted">
                  Current pitch: {editorFontSettings.lineHeight}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditorFontSetting(
                      "lineHeight",
                      Math.max(1.0, Math.round((editorFontSettings.lineHeight - 0.1) * 10) / 10),
                    )
                  }
                  className="w-7 h-7 rounded bg-bg-card hover:bg-bg-emphasis border border-border text-text text-xs font-bold flex items-center justify-center shadow-keycap active:shadow-keycap-pressed cursor-pointer"
                >
                  -
                </button>
                <span className="px-2.5 py-1 bg-bg-card text-primary font-mono text-xs font-bold rounded border border-border shadow-xs">
                  {editorFontSettings.lineHeight.toFixed(1)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEditorFontSetting(
                      "lineHeight",
                      Math.min(2.5, Math.round((editorFontSettings.lineHeight + 0.1) * 10) / 10),
                    )
                  }
                  className="w-7 h-7 rounded bg-bg-card hover:bg-bg-emphasis border border-border text-text text-xs font-bold flex items-center justify-center shadow-keycap active:shadow-keycap-pressed cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Page Width */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-text">
                  Column Width Restriction
                </div>
                <div className="text-[10px] text-text-muted">
                  Preset: {editorWidth.toUpperCase()}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Select
                  value={editorWidth}
                  onChange={(e) => setEditorWidth(e.target.value as EditorWidth)}
                  className="w-32 font-mono text-xs"
                >
                  {editorWidthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Custom Editor Width Input if custom selected */}
          {editorWidth === "custom" && (
            <div className="flex items-center justify-between pt-2 border-t border-border/70 font-mono">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-text">
                  Custom Max Width (px)
                </div>
                <div className="text-[10px] text-text-muted">
                  Set precise container width in pixels
                </div>
              </div>
              <Input
                type="number"
                min={400}
                max={2400}
                step={20}
                value={customEditorWidthPx}
                onChange={(e) => setCustomEditorWidthPx(Math.max(400, parseInt(e.target.value) || 750))}
                className="w-32 font-mono text-xs"
              />
            </div>
          )}

          {/* Text Direction */}
          <div className="flex items-center justify-between pt-2 border-t border-border/70 font-mono">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-text">
                Text Flow Direction
              </div>
              <div className="text-[10px] text-text-muted">
                LTR (Left to Right) or RTL (Right to Left)
              </div>
            </div>
            <div className="flex items-center gap-1 bg-bg-card p-0.5 rounded-lg border border-border">
              {textDirectionOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTextDirection(opt.value)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                    textDirection === opt.value
                      ? "bg-primary text-white font-bold"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interface Zoom */}
          <div className="flex items-center justify-between pt-2 border-t border-border/70 font-mono">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-text">
                Hardware Scale / Zoom Level
              </div>
              <div className="text-[10px] text-text-muted">
                Display viewport multiplier
              </div>
            </div>
            <div className="flex items-center gap-1.5 w-36">
              <button
                type="button"
                onClick={() => setInterfaceZoom((prev) => Math.max(0.7, prev - 0.05))}
                disabled={interfaceZoom <= 0.7}
                className="w-7 h-7 rounded bg-bg-card hover:bg-bg-emphasis border border-border text-text text-xs font-bold flex items-center justify-center shadow-keycap active:shadow-keycap-pressed cursor-pointer disabled:opacity-40"
              >
                <MinusIcon className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold font-mono text-primary flex-1 text-center bg-bg-card py-1 rounded border border-border">
                {Math.round(interfaceZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setInterfaceZoom((prev) => Math.min(1.5, prev + 0.05))}
                disabled={interfaceZoom >= 1.5}
                className="w-7 h-7 rounded bg-bg-card hover:bg-bg-emphasis border border-border text-text text-xs font-bold flex items-center justify-center shadow-keycap active:shadow-keycap-pressed cursor-pointer disabled:opacity-40"
              >
                <PlusIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Expandable subsection for customizing colors for a single theme mode
function ColorsExpandable({
  label,
  mode,
  customColors,
  setCustomColor,
  resetCustomColor,
  resetAllCustomColors,
  className,
}: {
  label: string;
  mode: "light" | "dark";
  customColors: Partial<Record<ThemeColorKey, string>>;
  setCustomColor: (
    mode: "light" | "dark",
    key: ThemeColorKey,
    value: string,
  ) => void;
  resetCustomColor: (mode: "light" | "dark", key: ThemeColorKey) => void;
  resetAllCustomColors: (mode: "light" | "dark") => void;
  className?: string;
}) {
  const defaults = defaultThemeColors[mode];
  const hasAnyCustom = Object.keys(customColors).length > 0;

  return (
    <details className={cn("text-sm", className)}>
      <summary className="cursor-pointer text-text-muted hover:text-text select-none flex items-center gap-1 font-medium">
        <ChevronRightIcon className="w-3.5 h-3.5 stroke-2 transition-transform [[open]>&]:rotate-90" />
        {label}
        {hasAnyCustom && (
          <Button
            onClick={(e) => {
              e.preventDefault();
              resetAllCustomColors(mode);
            }}
            variant="ghost"
            size="sm"
            className="ml-auto"
          >
            Reset all
          </Button>
        )}
      </summary>
      <div className="mt-2 rounded-[10px] border border-border pl-4 py-3 pr-3 space-y-1.5">
        {(() => {
          let lastGroup = "";
          return colorLabels.map(({ key, label: colorLabel, group }) => {
            const showGroup = group !== lastGroup;
            lastGroup = group;
            return (
              <div key={key}>
                {showGroup && (
                  <div
                    className={`text-base text-text-muted font-medium ${key !== colorLabels[0].key ? "mt-6" : ""} mb-2.5`}
                  >
                    {group}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-text font-medium">
                    {colorLabel}
                  </label>
                  <ColorPicker
                    color={customColors[key] ?? defaults[key]}
                    defaultColor={defaults[key]}
                    onChange={(value) => setCustomColor(mode, key, value)}
                    onReset={() => resetCustomColor(mode, key)}
                  />
                </div>
              </div>
            );
          });
        })()}
      </div>
    </details>
  );
}
