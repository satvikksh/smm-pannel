/**
 * Panel themes. The selection is validated against this enum on the backend.
 * Arbitrary CSS/HTML is never accepted. All themes share the same token set
 * (see `packages/ui/src/tokens.css`) — adding a theme is just another entry
 * here plus a scoped palette block in tokens.css.
 */
export const PANEL_THEMES = [
  'modern-light',
  'modern-dark',
  'premium-gradient',
  'vibrant-neon',
  'sunset-tropical',
  'ocean-aurora',
] as const;

export type PanelTheme = (typeof PANEL_THEMES)[number];

export const DEFAULT_PANEL_THEME: PanelTheme = 'modern-light';

/**
 * The three flagship colorful themes surfaced on the Appearance / Themes page.
 * The neutral light/dark themes stay available but are not marketed as
 * "premium themes".
 */
export const PREMIUM_PANEL_THEMES: readonly PanelTheme[] = [
  'vibrant-neon',
  'sunset-tropical',
  'ocean-aurora',
];

export const PANEL_THEME_LABELS: Record<PanelTheme, string> = {
  'modern-light': 'Modern Light',
  'modern-dark': 'Modern Dark',
  'premium-gradient': 'Premium Gradient',
  'vibrant-neon': 'Vibrant Neon',
  'sunset-tropical': 'Sunset Tropical',
  'ocean-aurora': 'Ocean Aurora',
};

export const PANEL_THEME_DESCRIPTIONS: Record<PanelTheme, string> = {
  'modern-light': 'Clean light interface',
  'modern-dark': 'Premium navy dark mode',
  'premium-gradient': 'Warm gradient colors',
  'vibrant-neon': 'Electric purple, pink & cyan on deep space',
  'sunset-tropical': 'Warm orange, coral & pink sunsets',
  'ocean-aurora': 'Cool cyan, blue & purple northern lights',
};

/** Primary palette swatches shown on the theme preview cards. */
export const PANEL_THEME_SWATCHES: Record<PanelTheme, string[]> = {
  'modern-light': ['#4f46e5', '#6366f1', '#a5b4fc'],
  'modern-dark': ['#6366f1', '#818cf8', '#60a5fa'],
  'premium-gradient': ['#f97316', '#f43f5e', '#ec4899'],
  'vibrant-neon': ['#a855f7', '#ec4899', '#22d3ee'],
  'sunset-tropical': ['#ff8a3d', '#ff4d6d', '#ffd166'],
  'ocean-aurora': ['#06b6d4', '#2563eb', '#8b5cf6'],
};

/** Themes that render on a dark canvas (drives color-scheme + .dark). */
export const PANEL_THEME_DARK: readonly PanelTheme[] = ['modern-dark', 'vibrant-neon'];

export function isPanelTheme(value: unknown): value is PanelTheme {
  return typeof value === 'string' && (PANEL_THEMES as readonly string[]).includes(value);
}