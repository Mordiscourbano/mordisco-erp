import { BrandingSettingsForm } from "@/components/settings/branding-settings-form";
import { createClient } from "@/lib/supabase/server";
import type { BusinessSettings } from "@/lib/settings/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("business_settings").select("*").single();

  if (error || !data) {
    return <div className="error">{error?.message ?? "No se encontró la configuración del negocio."}</div>;
  }

  return <BrandingSettingsForm initialSettings={data as BusinessSettings} />;
}
