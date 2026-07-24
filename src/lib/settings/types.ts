export type ThemeMode = "light" | "dark" | "auto";

export type MediaBucket =
  | "logos"
  | "backgrounds"
  | "banners"
  | "products"
  | "avatars";

export interface MediaAsset {
  id: string;
  business_id: string;
  bucket: MediaBucket;
  folder: string | null;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  uploaded_by: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BusinessSettings {
  id: string;
  business_id: string;
  business_name: string;
  slogan: string | null;
  description: string | null;
  logo_asset_id: string | null;
  logo_small_asset_id: string | null;
  banner_asset_id: string | null;
  background_asset_id: string | null;
  primary_color: string;
  secondary_color: string;
  sidebar_color: string;
  accent_color: string;
  theme: ThemeMode;
  font_family: string;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export type BusinessSettingsUpdate = Partial<
  Omit<BusinessSettings, "id" | "business_id" | "created_at" | "updated_at">
>;

export interface ResolvedBusinessSettings extends BusinessSettings {
  logo_url: string | null;
  logo_small_url: string | null;
  banner_url: string | null;
  background_url: string | null;
}
