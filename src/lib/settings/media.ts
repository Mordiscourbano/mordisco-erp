import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaAsset, MediaBucket } from "./types";

export type SettingsAssetField =
  | "logo_asset_id"
  | "logo_small_asset_id"
  | "banner_asset_id"
  | "background_asset_id";

export async function createSignedAssetUrl(
  supabase: SupabaseClient,
  assetId: string | null,
  expiresIn = 86400
): Promise<string | null> {
  if (!assetId) return null;
  const { data: asset } = await supabase
    .from("media_assets")
    .select("bucket,storage_path")
    .eq("id", assetId)
    .eq("is_active", true)
    .maybeSingle();
  if (!asset) return null;
  const { data, error } = await supabase.storage
    .from(asset.bucket)
    .createSignedUrl(asset.storage_path, expiresIn);
  return error ? null : data.signedUrl;
}

export async function uploadSettingsImage(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    bucket: MediaBucket;
    field: SettingsAssetField;
    file: File;
    uploadedBy?: string | null;
  }
): Promise<{ asset: MediaAsset; signedUrl: string }> {
  const { businessId, bucket, field, file, uploadedBy = null } = params;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Formato no permitido.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("La imagen supera 5 MB.");
  }

  const safe = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const path = `${businessId}/${Date.now()}-${safe}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .insert({
      business_id: businessId,
      bucket,
      folder: businessId,
      filename: file.name,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: uploadedBy,
      is_active: true,
    })
    .select("*")
    .single();

  if (assetError || !asset) {
    await supabase.storage.from(bucket).remove([path]);
    throw new Error(assetError?.message || "No se pudo registrar la imagen.");
  }

  const { error: updateError } = await supabase
    .from("business_settings")
    .update({ [field]: asset.id })
    .eq("business_id", businessId);

  if (updateError) throw new Error(updateError.message);

  const signedUrl = await createSignedAssetUrl(supabase, asset.id);
  if (!signedUrl) throw new Error("No se pudo generar la vista previa.");

  return { asset: asset as MediaAsset, signedUrl };
}

export async function removeSettingsImage(
  supabase: SupabaseClient,
  params: { businessId: string; field: SettingsAssetField; assetId: string | null }
): Promise<void> {
  const { error } = await supabase
    .from("business_settings")
    .update({ [params.field]: null })
    .eq("business_id", params.businessId);
  if (error) throw new Error(error.message);

  if (params.assetId) {
    await supabase
      .from("media_assets")
      .update({ is_active: false })
      .eq("id", params.assetId);
  }
}
