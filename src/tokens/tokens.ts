// Master Design Tokens for Scratch
// Single Source of Truth for Design System, Tailwind CSS v4, and Runtime Theme Engine.

export type SemanticColorKey =
  | "surface-primary"
  | "surface-secondary"
  | "surface-muted"
  | "surface-emphasis"
  | "content-primary"
  | "content-muted"
  | "content-inverse"
  | "border-default"
  | "accent-primary"
  | "accent-selection";

// Legacy color keys for migration and backward compatibility
export type LegacyColorKey =
  | "bg"
  | "bg-secondary"
  | "bg-muted"
  | "bg-emphasis"
  | "text"
  | "text-muted"
  | "text-inverse"
  | "border"
  | "accent"
  | "selection";

export type ThemeColorKey = SemanticColorKey | LegacyColorKey;

export const LEGACY_TO_SEMANTIC_KEY_MAP: Record<LegacyColorKey, SemanticColorKey> = {
  bg: "surface-primary",
  "bg-secondary": "surface-secondary",
  "bg-muted": "surface-muted",
  "bg-emphasis": "surface-emphasis",
  text: "content-primary",
  "text-muted": "content-muted",
  "text-inverse": "content-inverse",
  border: "border-default",
  accent: "accent-primary",
  selection: "accent-selection",
};

export const SEMANTIC_TO_LEGACY_KEY_MAP: Record<SemanticColorKey, LegacyColorKey> = {
  "surface-primary": "bg",
  "surface-secondary": "bg-secondary",
  "surface-muted": "bg-muted",
  "surface-emphasis": "bg-emphasis",
  "content-primary": "text",
  "content-muted": "text-muted",
  "content-inverse": "text-inverse",
  "border-default": "border",
  "accent-primary": "accent",
  "accent-selection": "selection",
};

export interface DesignTokens {
  colors: {
    semantic: Record<"light" | "dark", Record<SemanticColorKey, string>>;
    braun: {
      yellow: string;
      orange: { light: string; dark: string };
      green: { light: string; dark: string };
      blue: { light: string; dark: string };
    };
    syntax: Record<
      "light" | "dark",
      {
        keyword: string;
        string: string;
        number: string;
        comment: string;
        function: string;
        variable: string;
        type: string;
        operator: string;
        attr: string;
        code: string;
      }
    >;
    tags: string[];
  };
  typography: {
    fonts: {
      sans: string;
      serif: string;
      mono: string;
      systemSans: string;
    };
    sizes: {
      "2xs": { size: string; lineHeight: string };
      xs: { size: string; lineHeight: string };
    };
    editorDefaults: {
      baseFontFamily: "neue-haas" | "system-sans" | "serif" | "monospace";
      baseFontSize: number;
      boldWeight: number;
      lineHeight: number;
      paragraphSpacing: string;
    };
  };
  layout: {
    editorWidths: {
      narrow: string;
      normal: string;
      wide: string;
      full: string;
      defaultCustomWidthPx: number;
    };
    sidebar: {
      minPx: number;
      maxPx: number;
    };
  };
  motion: {
    keyframes: Record<string, Record<string, Record<string, string>>>;
    animations: Record<string, string>;
  };
}

export const tokens: DesignTokens = {
  colors: {
    semantic: {
      light: {
        "surface-primary": "#F4F3EE",
        "surface-secondary": "#EBEAE4",
        "surface-muted": "rgba(29, 29, 31, 0.05)",
        "surface-emphasis": "rgba(29, 29, 31, 0.08)",
        "content-primary": "#1D1D1F",
        "content-muted": "#6E6D70",
        "content-inverse": "#F4F3EE",
        "border-default": "#D8D6CE",
        "accent-primary": "#F5A623",
        "accent-selection": "rgba(245, 166, 35, 0.25)",
      },
      dark: {
        "surface-primary": "#18191B",
        "surface-secondary": "#202225",
        "surface-muted": "rgba(238, 238, 240, 0.06)",
        "surface-emphasis": "rgba(238, 238, 240, 0.10)",
        "content-primary": "#EEEEF0",
        "content-muted": "#9FA0A5",
        "content-inverse": "#18191B",
        "border-default": "#2E3137",
        "accent-primary": "#F5A623",
        "accent-selection": "rgba(245, 166, 35, 0.35)",
      },
    },
    braun: {
      yellow: "#F5A623",
      orange: { light: "#E65100", dark: "#FF7043" },
      green: { light: "#2E7D32", dark: "#4CAF50" },
      blue: { light: "#0066CC", dark: "#29B6F6" },
    },
    syntax: {
      light: {
        keyword: "#d73a49",
        string: "#032f62",
        number: "#005cc5",
        comment: "#6a737d",
        function: "#6f42c1",
        variable: "#e36209",
        type: "#22863a",
        operator: "#d73a49",
        attr: "#005cc5",
        code: "#d73a49",
      },
      dark: {
        keyword: "#ea4a5a",
        string: "#79b8ff",
        number: "#79b8ff",
        comment: "#959da5",
        function: "#b392f0",
        variable: "#fb8532",
        type: "#7bcc72",
        operator: "#ea4a5a",
        attr: "#79b8ff",
        code: "#ea4a5a",
      },
    },
    tags: [
      // Reds & Corals
      "#ef4444",
      "#f43f5e",
      "#e11d48",
      // Oranges & Braun Accents
      "#f97316",
      "#e65100",
      "#f5a623",
      "#f59e0b",
      "#eab308",
      // Greens & Mints
      "#84cc16",
      "#22c55e",
      "#2e7d32",
      "#10b981",
      // Cyans & Teals
      "#14b8a6",
      "#06b6d4",
      "#0ea5e9",
      // Blues & Indigos
      "#0066cc",
      "#3b82f6",
      "#6366f1",
      // Purples & Pinks
      "#8b5cf6",
      "#a855f7",
      "#d946ef",
      "#ec4899",
      // Neutrals & Earth tones
      "#64748b",
      "#78716c",
    ],
  },
  typography: {
    fonts: {
      sans: '"Neue Haas Grotesk Text Pro", "Neue Haas Grotesk Text", "Neue Haas Grotesk", "Helvetica Neue", Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
      systemSans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif, "Apple Color Emoji"',
      mono: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, "Courier New", monospace',
    },
    sizes: {
      "2xs": { size: "0.75rem", lineHeight: "1rem" },
      xs: { size: "0.8125rem", lineHeight: "1.25rem" },
    },
    editorDefaults: {
      baseFontFamily: "neue-haas",
      baseFontSize: 15,
      boldWeight: 600,
      lineHeight: 1.6,
      paragraphSpacing: "0.875em",
    },
  },
  layout: {
    editorWidths: {
      narrow: "36rem",
      normal: "48rem",
      wide: "64rem",
      full: "100%",
      defaultCustomWidthPx: 768,
    },
    sidebar: {
      minPx: 180,
      maxPx: 480,
    },
  },
  motion: {
    keyframes: {
      "fade-in": {
        from: { opacity: "0" },
        to: { opacity: "1" },
      },
      "slide-down": {
        from: { opacity: "0", transform: "translateY(-6px) scale(0.99)" },
        to: { opacity: "1", transform: "translateY(0) scale(1)" },
      },
      "spin-slow": {
        from: { transform: "rotate(0deg)" },
        to: { transform: "rotate(360deg)" },
      },
      "bounce-gentle": {
        "0%, 100%": { transform: "translateY(0)" },
        "50%": { transform: "translateY(-3px)" },
      },
      "pulse-gentle": {
        "0%, 100%": { opacity: "1" },
        "50%": { opacity: "0.6" },
      },
      "fade-in-up": {
        from: { opacity: "0", transform: "translateY(8px)" },
        to: { opacity: "1", transform: "translateY(0)" },
      },
    },
    animations: {
      "fade-in": "fade-in 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
      "slide-down": "slide-down 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
      "spin-slow": "spin-slow 2s linear infinite",
      "bounce-gentle": "bounce-gentle 2s ease-in-out infinite",
      "pulse-gentle": "pulse-gentle 2s ease-in-out infinite",
      "fade-in-up": "fade-in-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
    },
  },
};
