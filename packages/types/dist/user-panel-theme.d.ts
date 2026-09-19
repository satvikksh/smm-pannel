/**
 * Panel themes. Exactly three palettes exist; the selection is validated
 * against this enum on the backend. Arbitrary CSS/HTML is never accepted.
 * Both the admin panel and user panel share this palette set.
 */
export declare const PANEL_THEMES: readonly ["modern-light", "modern-dark", "premium-gradient"];
export type PanelTheme = (typeof PANEL_THEMES)[number];
export declare const DEFAULT_PANEL_THEME: PanelTheme;
export declare const PANEL_THEME_LABELS: Record<PanelTheme, string>;
export declare function isPanelTheme(value: unknown): value is PanelTheme;
