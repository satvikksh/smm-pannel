/**
 * Panel themes. The selection is validated against this enum on the backend.
 * Arbitrary CSS/HTML is never accepted. All themes share the same token set
 * (see `packages/ui/src/tokens.css`) — adding a theme is just another entry
 * here plus a scoped palette block in tokens.css.
 */
export declare const PANEL_THEMES: readonly ["modern-light", "modern-dark", "premium-gradient", "vibrant-neon", "sunset-tropical", "ocean-aurora"];
export type PanelTheme = (typeof PANEL_THEMES)[number];
export declare const DEFAULT_PANEL_THEME: PanelTheme;
/**
 * The three flagship colorful themes surfaced on the Appearance / Themes page.
 * The neutral light/dark themes stay available but are not marketed as
 * "premium themes".
 */
export declare const PREMIUM_PANEL_THEMES: readonly PanelTheme[];
export declare const PANEL_THEME_LABELS: Record<PanelTheme, string>;
export declare const PANEL_THEME_DESCRIPTIONS: Record<PanelTheme, string>;
/** Primary palette swatches shown on the theme preview cards. */
export declare const PANEL_THEME_SWATCHES: Record<PanelTheme, string[]>;
/** Themes that render on a dark canvas (drives color-scheme + .dark). */
export declare const PANEL_THEME_DARK: readonly PanelTheme[];
export declare function isPanelTheme(value: unknown): value is PanelTheme;
