import type { BusinessSettings, ThemeMode } from "./types";

export const DEFAULT_THEME: ThemeMode = "light";

export const DEFAULT_COLORS = {
  primary: "#F4B400",
  secondary: "#111827",
  sidebar: "#111827",
  accent: "#F4B400",
} as const;

export const DEFAULT_FONT_FAMILY = "Inter";

export function createDefaultBusinessSettings(
  businessId: string,
  businessName = "Nuevo negocio"
): Omit<BusinessSettings, "id" | "created_at" | "updated_at"> {
  return {
    business_id: businessId,
    business_name: businessName,
    slogan: null,
    description: null,
    logo_asset_id: null,
    logo_small_asset_id: null,
    banner_asset_id: null,
    background_asset_id: null,
    primary_color: DEFAULT_COLORS.primary,
    secondary_color: DEFAULT_COLORS.secondary,
    sidebar_color: DEFAULT_COLORS.sidebar,
    accent_color: DEFAULT_COLORS.accent,
    theme: DEFAULT_THEME,
    font_family: DEFAULT_FONT_FAMILY,
    whatsapp: null,
    email: null,
    website: null,
    instagram: null,
    facebook: null,
    tiktok: null,
    address: null,
  };
}
