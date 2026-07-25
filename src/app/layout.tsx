import "./globals.css";
import "./design-system.css";
import "./ui.css";
import "./branding-settings.css";
import "./brand-color-editor.css";
import "./theme-engine.css";

import { AppShell } from "@/components/app-shell";
import {
  ThemeProvider,
  type RuntimeBranding,
} from "@/components/branding/theme-provider";
import { createClient } from "@/lib/supabase/server";
import { createSignedAssetUrl } from "@/lib/settings/media";
import type { BusinessSettings } from "@/lib/settings/types";

export const metadata = {
  title: "Mordisco ERP",
  description: "Gestión gastronómica integral",
};

const fallbackBranding: RuntimeBranding = {
  businessName: "Mordisco Urbano",
  slogan: "Gestión gastronómica",
  logoUrl: null,
  logoSmallUrl: null,
  backgroundUrl: null,
  primaryColor: "#F4B400",
  secondaryColor: "#111827",
  sidebarColor: "#111827",
  accentColor: "#F4B400",
  fontFamily: "Inter",
  theme: "light",
};

async function loadBranding(): Promise<RuntimeBranding> {
  try {
    const supabase = await createClient();

    const { data } = await supabase
      .from("business_settings")
      .select("*")
      .maybeSingle();

    if (!data) return fallbackBranding;

    const settings = data as BusinessSettings;

    const [logoUrl, logoSmallUrl, backgroundUrl] = await Promise.all([
      createSignedAssetUrl(supabase, settings.logo_asset_id),
      createSignedAssetUrl(supabase, settings.logo_small_asset_id),
      createSignedAssetUrl(supabase, settings.background_asset_id),
    ]);

    return {
      businessName: settings.business_name,
      slogan: settings.slogan,
      logoUrl,
      logoSmallUrl,
      backgroundUrl,
      primaryColor: settings.primary_color,
      secondaryColor: settings.secondary_color,
      sidebarColor: settings.sidebar_color,
      accentColor: settings.accent_color,
      fontFamily: settings.font_family,
      theme: settings.theme,
    };
  } catch {
    return fallbackBranding;
  }
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = await loadBranding();

  return (
    <html lang="es">
      <body>
        <ThemeProvider branding={branding}>
          <AppShell branding={branding}>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
