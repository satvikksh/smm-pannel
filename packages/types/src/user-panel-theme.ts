/**
 * Panel themes. Exactly three palettes exist; the selection is validated
 * against this enum on the backend. Arbitrary CSS/HTML is never accepted.
 * Both the admin panel and user panel share this palette set.
 */
export const PANEL_THEMES = ['modern-light', 'modern-dark', 'premium-gradient'] as const;

export type PanelTheme = (typeof PANEL_THEMES)[number];

export const DEFAULT_PANEL_THEME: PanelTheme = 'modern-light';

export const PANEL_THEME_LABELS: Record<PanelTheme, string> = {
  'modern-light': 'Modern Light',
  'modern-dark': 'Modern Dark',
  'premium-gradient': 'Premium Gradient',
};

export function isPanelTheme(value: unknown): value is PanelTheme {
  return typeof value === 'string' && (PANEL_THEMES as readonly string[]).includes(value);
}
