import { BrandingSettingsForm } from "@/components/settings/branding-settings-form";
import { createClient } from "@/lib/supabase/server";
import { createSignedAssetUrl } from "@/lib/settings/media";
import type { BusinessSettings } from "@/lib/settings/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("business_settings").select("*").single();

  if (error || !data) {
    return <div className="error">{error?.message ?? "No se encontró la configuración."}</div>;
  }

  const settings = data as BusinessSettings;
  const [logo, logoSmall, banner, background] = await Promise.all([
    createSignedAssetUrl(supabase, settings.logo_asset_id),
    createSignedAssetUrl(supabase, settings.logo_small_asset_id),
    createSignedAssetUrl(supabase, settings.banner_asset_id),
    createSignedAssetUrl(supabase, settings.background_asset_id),
  ]);

  return (
    <BrandingSettingsForm
      initialSettings={settings}
      initialImageUrls={{ logo, logoSmall, banner, background }}
    />
  );
}
