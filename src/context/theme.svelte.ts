import { invoke } from "@tauri-apps/api/core";
import { getSettings, updateSettings } from "../services/notes";
import { SIDEBAR_MIN_PX, SIDEBAR_MAX_PX } from "../lib/sidebar";
import type {
  ThemeSettings,
  EditorFontSettings,
  FontFamily,
  TextDirection,
  EditorWidth,
  CustomColors,
  ThemeColorKey,
} from "../types/note";

export type ThemeMode = "light" | "dark" | "system";

// Font family CSS values
const fontFamilyMap: Record<FontFamily, string> = {
  "neue-haas":
    '"Neue Haas Grotesk Text Pro", "Neue Haas Grotesk Text", "Neue Haas Grotesk", "Helvetica Neue", Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  "system-sans":
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  monospace:
    "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Monaco, 'Courier New', monospace",
};

// Editor width CSS values for presets
const editorWidthMap: Record<Exclude<EditorWidth, "custom">, string> = {
  narrow: "36rem",
  normal: "48rem",
  wide: "64rem",
  full: "100%",
};

// Default custom width in px
const DEFAULT_CUSTOM_WIDTH_PX = 768;

// Default editor font settings (simplified)
export const defaultEditorFontSettings: Required<EditorFontSettings> = {
  baseFontFamily: "neue-haas",
  baseFontSize: 15,
  boldWeight: 600,
  lineHeight: 1.6,
};

// Default theme colors (Braun-inspired: Alabaster / Anodized Graphite with Signal Yellow)
export const defaultThemeColors: Record<"light" | "dark", Record<ThemeColorKey, string>> = {
  light: {
    bg: "#F4F3EE",
    "bg-secondary": "#EBEAE4",
    "bg-muted": "rgba(29, 29, 31, 0.05)",
    "bg-emphasis": "rgba(29, 29, 31, 0.08)",
    text: "#1D1D1F",
    "text-muted": "#6E6D70",
    border: "#D8D6CE",
    accent: "#F5A623",
    selection: "rgba(245, 166, 35, 0.25)",
  },
  dark: {
    bg: "#18191B",
    "bg-secondary": "#202225",
    "bg-muted": "rgba(238, 238, 240, 0.06)",
    "bg-emphasis": "rgba(238, 238, 240, 0.10)",
    text: "#EEEEF0",
    "text-muted": "#9FA0A5",
    border: "#2E3137",
    accent: "#F5A623",
    selection: "rgba(245, 166, 35, 0.35)",
  },
};

// Normalize any CSS color string (hex, rgb(), rgba(), hsl(), named) to an RGB
// triple by letting the browser parse it via getComputedStyle.
function parseCssColorToRgb(value: string): [number, number, number] | null {
  if (typeof document === "undefined") return null;
  const probe = document.createElement("div");
  probe.style.color = value;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const match = computed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isTextDirection(value: unknown): value is TextDirection {
  return value === "auto" || value === "ltr" || value === "rtl";
}

export class ThemeState {
  theme = $state<ThemeMode>("system");
  systemTheme = $state<"light" | "dark">(
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );
  editorFontSettings = $state<Required<EditorFontSettings>>({ ...defaultEditorFontSettings });
  textDirection = $state<TextDirection>("auto");
  editorWidth = $state<EditorWidth>("normal");
  interfaceZoom = $state<number>(1.0);
  customEditorWidthPx = $state<number>(DEFAULT_CUSTOM_WIDTH_PX);
  sidebarWidthPx = $state<number | null>(null);
  customColorsLight = $state<CustomColors>({});
  customColorsDark = $state<CustomColors>({});
  animationsEnabled = $state<boolean>(true);
  isInitialized = $state<boolean>(false);

  resolvedTheme = $derived<"light" | "dark">(
    this.theme === "system" ? this.systemTheme : this.theme
  );

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private init() {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", (e) => {
      this.systemTheme = e.matches ? "dark" : "light";
    });

    this.loadSettingsFromBackend().finally(() => {
      this.isInitialized = true;
      this.applyAllStyles();
    });
  }

  async loadSettingsFromBackend() {
    try {
      const settings = await getSettings();
      if (settings.theme) {
        const mode = settings.theme.mode as ThemeMode;
        if (mode === "light" || mode === "dark" || mode === "system") {
          this.theme = mode;
        }
      }
      if (settings.editorFont) {
        const fontSettings = Object.fromEntries(
          Object.entries(settings.editorFont).filter(([, v]) => v != null)
        ) as Partial<EditorFontSettings>;
        this.editorFontSettings = {
          ...defaultEditorFontSettings,
          ...fontSettings,
        };
      }
      if (isTextDirection(settings.textDirection)) {
        this.textDirection = settings.textDirection;
      }
      if (
        settings.editorWidth === "narrow" ||
        settings.editorWidth === "normal" ||
        settings.editorWidth === "wide" ||
        settings.editorWidth === "full" ||
        settings.editorWidth === "custom"
      ) {
        this.editorWidth = settings.editorWidth;
      }
      if (
        typeof settings.interfaceZoom === "number" &&
        settings.interfaceZoom >= 0.7 &&
        settings.interfaceZoom <= 1.5
      ) {
        this.interfaceZoom = settings.interfaceZoom;
      }
      if (
        typeof settings.customEditorWidthPx === "number" &&
        settings.customEditorWidthPx >= 480
      ) {
        this.customEditorWidthPx = settings.customEditorWidthPx;
      }
      if (
        typeof settings.sidebarWidthPx === "number" &&
        settings.sidebarWidthPx >= SIDEBAR_MIN_PX &&
        settings.sidebarWidthPx <= SIDEBAR_MAX_PX
      ) {
        this.sidebarWidthPx = settings.sidebarWidthPx;
      }
      if (settings.customColorsLight) {
        this.customColorsLight = settings.customColorsLight;
      }
      if (settings.customColorsDark) {
        this.customColorsDark = settings.customColorsDark;
      }
      if (typeof settings.animationsEnabled === "boolean") {
        this.animationsEnabled = settings.animationsEnabled;
      }
      this.applyAllStyles();
    } catch {
      // If settings can't be loaded, use defaults
    }
  }

  async reloadSettings() {
    await this.loadSettingsFromBackend();
  }

  applyAllStyles() {
    if (typeof document === "undefined") return;
    this.applyThemeClass();
    this.applyFontCSSVariables();
    this.applyLayoutCSSVariables();
    this.applySidebarWidth();
    this.applyInterfaceZoom();
    this.applyCustomColors();
    this.applyAnimationStyles();
  }

  private applyAnimationStyles() {
    const root = document.documentElement;
    if (this.animationsEnabled) {
      root.classList.remove("no-animations");
    } else {
      root.classList.add("no-animations");
    }
  }

  private applyThemeClass() {
    const root = document.documentElement;
    if (this.resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }

  private applyFontCSSVariables() {
    const root = document.documentElement;
    const fonts = this.editorFontSettings;
    const fontFamily = fontFamilyMap[fonts.baseFontFamily];
    const baseSize = fonts.baseFontSize;
    const boldWeight = fonts.boldWeight;
    const lineHeight = fonts.lineHeight;

    root.style.setProperty("--editor-font-family", fontFamily);
    root.style.setProperty("--editor-base-font-size", `${baseSize}px`);
    root.style.setProperty("--editor-bold-weight", String(boldWeight));
    root.style.setProperty("--editor-line-height", String(lineHeight));

    root.style.setProperty("--editor-h1-size", `${baseSize * 2.25}px`);
    root.style.setProperty("--editor-h2-size", `${baseSize * 1.75}px`);
    root.style.setProperty("--editor-h3-size", `${baseSize * 1.5}px`);
    root.style.setProperty("--editor-h4-size", `${baseSize * 1.25}px`);
    root.style.setProperty("--editor-h5-size", `${baseSize}px`);
    root.style.setProperty("--editor-h6-size", `${baseSize}px`);
    root.style.setProperty("--editor-paragraph-spacing", "0.875em");
  }

  private applyLayoutCSSVariables() {
    const root = document.documentElement;
    if (this.editorWidth === "custom") {
      root.style.setProperty("--editor-max-width", `${this.customEditorWidthPx}px`);
    } else {
      root.style.setProperty("--editor-max-width", editorWidthMap[this.editorWidth]);
    }
  }

  private applySidebarWidth() {
    if (this.sidebarWidthPx === null) {
      document.documentElement.style.removeProperty("--sidebar-width");
    } else {
      document.documentElement.style.setProperty("--sidebar-width", `${this.sidebarWidthPx}px`);
    }
  }

  private applyInterfaceZoom() {
    const root = document.documentElement;
    root.classList.add("zoom-no-transition");
    root.style.zoom = String(this.interfaceZoom);
    const raf = requestAnimationFrame(() => {
      root.classList.remove("zoom-no-transition");
    });
    return () => cancelAnimationFrame(raf);
  }

  applyCustomColors() {
    const root = document.documentElement;
    const activeColors = this.resolvedTheme === "dark" ? this.customColorsDark : this.customColorsLight;
    const defaults = defaultThemeColors[this.resolvedTheme];
    const keys: ThemeColorKey[] = [
      "bg", "bg-secondary", "bg-muted", "bg-emphasis",
      "text", "text-muted", "border", "accent", "selection",
    ];
    for (const key of keys) {
      const value = activeColors[key] ?? defaults[key];
      root.style.setProperty(`--color-${key}`, value);
    }

    const captionColor = activeColors["bg-secondary"] ?? defaults["bg-secondary"];
    const rgb = parseCssColorToRgb(captionColor);
    if (rgb) {
      invoke("set_title_bar_theme", {
        isDark: this.resolvedTheme === "dark",
        r: rgb[0],
        g: rgb[1],
        b: rgb[2],
      }).catch(() => {});
    }
  }

  async setTheme(newTheme: ThemeMode) {
    this.theme = newTheme;
    this.applyThemeClass();
    this.applyCustomColors();
    try {
      const settings = await getSettings();
      await updateSettings({
        ...settings,
        theme: { mode: newTheme } as ThemeSettings,
      });
    } catch (error) {
      console.error("Failed to save theme settings:", error);
    }
  }

  cycleTheme() {
    const order: ThemeMode[] = ["light", "dark", "system"];
    const currentIndex = order.indexOf(this.theme);
    const nextIndex = (currentIndex + 1) % order.length;
    this.setTheme(order[nextIndex]);
  }

  async setEditorFontSetting<K extends keyof EditorFontSettings>(
    key: K,
    value: EditorFontSettings[K]
  ) {
    this.editorFontSettings = { ...this.editorFontSettings, [key]: value };
    this.applyFontCSSVariables();
    try {
      const settings = await getSettings();
      await updateSettings({
        ...settings,
        editorFont: this.editorFontSettings,
      });
    } catch (error) {
      console.error("Failed to save font settings:", error);
    }
  }

  async resetEditorFontSettings() {
    this.editorFontSettings = { ...defaultEditorFontSettings };
    this.textDirection = "auto";
    this.editorWidth = "normal";
    this.interfaceZoom = 1.0;
    this.sidebarWidthPx = null;
    this.customColorsLight = {};
    this.customColorsDark = {};
    this.animationsEnabled = true;
    this.applyAllStyles();
    try {
      const settings = await getSettings();
      await updateSettings({
        ...settings,
        editorFont: defaultEditorFontSettings,
        textDirection: "auto",
        editorWidth: "normal",
        interfaceZoom: 1.0,
        animationsEnabled: true,
        customEditorWidthPx: undefined,
        sidebarWidthPx: undefined,
        customColorsLight: undefined,
        customColorsDark: undefined,
      });
    } catch (error) {
      console.error("Failed to reset editor settings:", error);
    }
  }

  async setAnimationsEnabled(enabled: boolean) {
    this.animationsEnabled = enabled;
    this.applyAnimationStyles();
    try {
      const settings = await getSettings();
      await updateSettings({
        ...settings,
        animationsEnabled: enabled,
      });
    } catch (error) {
      console.error("Failed to save animations setting:", error);
    }
  }

  async setTextDirection(dir: TextDirection) {
    this.textDirection = dir;
    document.documentElement.dir = dir === "auto" ? "auto" : dir;
    try {
      const settings = await getSettings();
      await updateSettings({ ...settings, textDirection: dir });
    } catch (error) {
      console.error("Failed to save text direction:", error);
    }
  }

  async setEditorWidth(width: EditorWidth) {
    this.editorWidth = width;
    this.applyLayoutCSSVariables();
    try {
      const settings = await getSettings();
      await updateSettings({ ...settings, editorWidth: width });
    } catch (error) {
      console.error("Failed to save editor width:", error);
    }
  }

  async setCustomEditorWidthPx(px: number) {
    this.editorWidth = "custom";
    this.customEditorWidthPx = px;
    this.applyLayoutCSSVariables();
    try {
      const settings = await getSettings();
      await updateSettings({
        ...settings,
        editorWidth: "custom",
        customEditorWidthPx: px,
      });
    } catch (error) {
      console.error("Failed to save custom editor width:", error);
    }
  }

  setEditorMaxWidthLive(value: string) {
    document.documentElement.style.setProperty("--editor-max-width", value);
  }

  setInterfaceZoom(zoomOrUpdater: number | ((prev: number) => number)) {
    const raw = typeof zoomOrUpdater === "function" ? zoomOrUpdater(this.interfaceZoom) : zoomOrUpdater;
    this.interfaceZoom = Math.round(Math.min(Math.max(raw, 0.7), 1.5) * 20) / 20;
    this.applyInterfaceZoom();
    getSettings()
      .then((settings) => updateSettings({ ...settings, interfaceZoom: this.interfaceZoom }))
      .catch((error) => console.error("Failed to save interface zoom:", error));
  }

  async setSidebarWidthPx(px: number | null) {
    if (px === null) {
      this.sidebarWidthPx = null;
      this.applySidebarWidth();
      try {
        const settings = await getSettings();
        await updateSettings({ ...settings, sidebarWidthPx: undefined });
      } catch (error) {
        console.error("Failed to reset sidebar width:", error);
      }
    } else {
      const clamped = Math.round(Math.min(Math.max(px, SIDEBAR_MIN_PX), SIDEBAR_MAX_PX));
      this.sidebarWidthPx = clamped;
      this.applySidebarWidth();
      try {
        const settings = await getSettings();
        await updateSettings({ ...settings, sidebarWidthPx: clamped });
      } catch (error) {
        console.error("Failed to save sidebar width:", error);
      }
    }
  }

  setSidebarWidthLive(px: number) {
    document.documentElement.style.setProperty("--sidebar-width", `${px}px`);
  }

  async setCustomColor(mode: "light" | "dark", key: ThemeColorKey, value: string) {
    if (mode === "light") {
      this.customColorsLight = { ...this.customColorsLight, [key]: value };
    } else {
      this.customColorsDark = { ...this.customColorsDark, [key]: value };
    }
    this.applyCustomColors();
    const settingsKey = mode === "light" ? "customColorsLight" : "customColorsDark";
    const updated = mode === "light" ? this.customColorsLight : this.customColorsDark;
    getSettings()
      .then((settings) => updateSettings({ ...settings, [settingsKey]: updated }))
      .catch((err) => console.error("Failed to save custom color:", err));
  }

  async resetCustomColor(mode: "light" | "dark", key: ThemeColorKey) {
    if (mode === "light") {
      const updated = { ...this.customColorsLight };
      delete updated[key];
      this.customColorsLight = updated;
    } else {
      const updated = { ...this.customColorsDark };
      delete updated[key];
      this.customColorsDark = updated;
    }
    this.applyCustomColors();
    const settingsKey = mode === "light" ? "customColorsLight" : "customColorsDark";
    const updated = mode === "light" ? this.customColorsLight : this.customColorsDark;
    getSettings()
      .then((settings) =>
        updateSettings({
          ...settings,
          [settingsKey]: Object.keys(updated).length > 0 ? updated : undefined,
        })
      )
      .catch((err) => console.error("Failed to reset custom color:", err));
  }

  async resetAllCustomColors(mode: "light" | "dark") {
    if (mode === "light") {
      this.customColorsLight = {};
    } else {
      this.customColorsDark = {};
    }
    this.applyCustomColors();
    const settingsKey = mode === "light" ? "customColorsLight" : "customColorsDark";
    try {
      const settings = await getSettings();
      await updateSettings({ ...settings, [settingsKey]: undefined });
    } catch (err) {
      console.error("Failed to reset all custom colors:", err);
    }
  }
}

export const themeState = new ThemeState();
