import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaAsset, MediaBucket } from "./types";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function sanitizeFilename(filename: string): string {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

export async function uploadBusinessImage(
  supabase: SupabaseClient,
  params: {
    businessId: string;
    bucket: MediaBucket;
    file: File;
    uploadedBy?: string | null;
    folder?: string;
  }
): Promise<MediaAsset> {
  const { businessId, bucket, file, uploadedBy = null, folder = businessId } = params;

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Formato no permitido. Usá JPG, PNG o WebP.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("La imagen supera el máximo permitido de 5 MB.");
  }

  const safeName = sanitizeFilename(file.name);
  const uniqueName = `${Date.now()}-${safeName}`;
  const storagePath = `${folder}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(`No se pudo subir la imagen: ${uploadError.message}`);
  }

  const { data, error: insertError } = await supabase
    .from("media_assets")
    .insert({
      business_id: businessId,
      bucket,
      folder,
      filename: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: uploadedBy,
      is_active: true,
    })
    .select("*")
    .single();

  if (insertError) {
    await supabase.storage.from(bucket).remove([storagePath]);
    throw new Error(`No se pudo registrar la imagen: ${insertError.message}`);
  }

  return data as MediaAsset;
}

export async function deactivateBusinessAsset(
  supabase: SupabaseClient,
  assetId: string
): Promise<void> {
  const { error } = await supabase
    .from("media_assets")
    .update({ is_active: false })
    .eq("id", assetId);

  if (error) {
    throw new Error(`No se pudo desactivar el archivo: ${error.message}`);
  }
}
