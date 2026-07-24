import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessSettings, BusinessSettingsUpdate, MediaAsset, ResolvedBusinessSettings } from "./types";

async function resolveAssetUrl(
  supabase: SupabaseClient,
  assetId: string | null
): Promise<string | null> {
  if (!assetId) return null;

  const { data: asset, error } = await supabase
    .from("media_assets")
    .select("bucket,storage_path")
    .eq("id", assetId)
    .eq("is_active", true)
    .single();

  if (error || !asset) return null;

  const { data } = supabase.storage
    .from(asset.bucket)
    .getPublicUrl(asset.storage_path);

  return data.publicUrl || null;
}

export async function getBusinessSettings(
  supabase: SupabaseClient
): Promise<ResolvedBusinessSettings> {
  const { data, error } = await supabase
    .from("business_settings")
    .select("*")
    .single();

  if (error) {
    throw new Error(`No se pudo cargar la configuración: ${error.message}`);
  }

  const settings = data as BusinessSettings;
  const [logo_url, logo_small_url, banner_url, background_url] = await Promise.all([
    resolveAssetUrl(supabase, settings.logo_asset_id),
    resolveAssetUrl(supabase, settings.logo_small_asset_id),
    resolveAssetUrl(supabase, settings.banner_asset_id),
    resolveAssetUrl(supabase, settings.background_asset_id),
  ]);

  return { ...settings, logo_url, logo_small_url, banner_url, background_url };
}

export async function updateBusinessSettings(
  supabase: SupabaseClient,
  businessId: string,
  payload: BusinessSettingsUpdate
): Promise<BusinessSettings> {
  const { data, error } = await supabase
    .from("business_settings")
    .update(payload)
    .eq("business_id", businessId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`No se pudo guardar la configuración: ${error.message}`);
  }

  return data as BusinessSettings;
}

export async function listBusinessAssets(
  supabase: SupabaseClient,
  businessId: string
): Promise<MediaAsset[]> {
  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`No se pudieron cargar los archivos: ${error.message}`);
  }

  return (data ?? []) as MediaAsset[];
}
