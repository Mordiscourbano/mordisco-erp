'use client';

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BusinessSettings, BusinessSettingsUpdate, MediaBucket, ThemeMode } from "@/lib/settings/types";
import { removeSettingsImage, SettingsAssetField, uploadSettingsImage } from "@/lib/settings/media";
import { Alert, Button, Card, CardContent, CardHeader, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { ImageUploadField } from "./image-upload-field";
import { BrandColorEditor, type BrandColors } from "./brand-color-editor";
type ImageKey = "logo" | "logoSmall" | "banner" | "background";
type ImageUrls = Record<ImageKey, string | null>;

const images: Record<ImageKey, {
  label: string;
  description: string;
  bucket: MediaBucket;
  field: SettingsAssetField;
  assetField: "logo_asset_id" | "logo_small_asset_id" | "banner_asset_id" | "background_asset_id";
}> = {
  logo: { label: "Logo principal", description: "PNG, JPG o WebP. Máximo 5 MB.", bucket: "logos", field: "logo_asset_id", assetField: "logo_asset_id" },
  logoSmall: { label: "Logo reducido", description: "Imagen cuadrada para menú y futura app.", bucket: "logos", field: "logo_small_asset_id", assetField: "logo_small_asset_id" },
  banner: { label: "Banner", description: "Imagen horizontal para portada y catálogo.", bucket: "banners", field: "banner_asset_id", assetField: "banner_asset_id" },
  background: { label: "Fondo", description: "Fondo opcional para login y portadas.", bucket: "backgrounds", field: "background_asset_id", assetField: "background_asset_id" },
};

export function BrandingSettingsForm({
  initialSettings,
  initialImageUrls,
}: {
  initialSettings: BusinessSettings;
  initialImageUrls: ImageUrls;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [imageUrls, setImageUrls] = useState(initialImageUrls);
  const [uploading, setUploading] = useState<ImageKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type:"success"|"danger";text:string}|null>(null);
const currentColors: BrandColors = {
  primary: settings.primary_color,
  secondary: settings.secondary_color,
  accent: settings.accent_color,
  sidebar: settings.sidebar_color,
};
  function update<K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) {
    setSettings(current => ({ ...current, [key]: value }));
  }
function updateColors(colors: BrandColors) {
  setSettings(current => ({
    ...current,
    primary_color: colors.primary,
    secondary_color: colors.secondary,
    accent_color: colors.accent,
    sidebar_color: colors.sidebar,
  }));
}
  async function uploadImage(key: ImageKey, file: File) {
    const config = images[key];
    setUploading(key);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { asset, signedUrl } = await uploadSettingsImage(supabase, {
        businessId: settings.business_id,
        bucket: config.bucket,
        field: config.field,
        file,
        uploadedBy: user?.id ?? null,
      });
      setSettings(current => ({ ...current, [config.assetField]: asset.id }));
      setImageUrls(current => ({ ...current, [key]: signedUrl }));
      setMessage({ type: "success", text: `${config.label} actualizado.` });
    } catch (error) {
      setMessage({ type: "danger", text: error instanceof Error ? error.message : "No se pudo subir la imagen." });
    } finally {
      setUploading(null);
    }
  }

  async function removeImage(key: ImageKey) {
    const config = images[key];
    setUploading(key);
    setMessage(null);
    try {
      await removeSettingsImage(createClient(), {
        businessId: settings.business_id,
        field: config.field,
        assetId: settings[config.assetField],
      });
      setSettings(current => ({ ...current, [config.assetField]: null }));
      setImageUrls(current => ({ ...current, [key]: null }));
      setMessage({ type: "success", text: `${config.label} quitado.` });
    } catch (error) {
      setMessage({ type: "danger", text: error instanceof Error ? error.message : "No se pudo quitar la imagen." });
    } finally {
      setUploading(null);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const payload: BusinessSettingsUpdate = {
      business_name: settings.business_name.trim(),
      slogan: settings.slogan?.trim() || null,
      description: settings.description?.trim() || null,
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
      sidebar_color: settings.sidebar_color,
      accent_color: settings.accent_color,
      theme: settings.theme,
      font_family: settings.font_family,
      whatsapp: settings.whatsapp?.trim() || null,
      email: settings.email?.trim() || null,
      website: settings.website?.trim() || null,
      instagram: settings.instagram?.trim() || null,
      facebook: settings.facebook?.trim() || null,
      tiktok: settings.tiktok?.trim() || null,
      address: settings.address?.trim() || null,
    };
    const { data, error } = await createClient()
      .from("business_settings")
      .update(payload)
      .eq("business_id", settings.business_id)
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      setMessage({ type: "danger", text: error.message });
      return;
    }
    setSettings(data as BusinessSettings);
    setMessage({ type: "success", text: "Configuración guardada." });
  }

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Personalizá la identidad y apariencia del negocio."
        actions={<Button form="branding-settings-form" type="submit" loading={saving}>Guardar cambios</Button>}
      />

      {message && <Alert variant={message.type}>{message.text}</Alert>}

      <form id="branding-settings-form" onSubmit={save} className="branding-settings-layout">
        <div className="branding-settings-main">
          <Card>
            <CardHeader title="Identidad del negocio" />
            <CardContent>
              <div className="ui-form-grid">
                <Input label="Nombre comercial" value={settings.business_name} onChange={e => update("business_name", e.target.value)} required />
                <Input label="Eslogan" value={settings.slogan ?? ""} onChange={e => update("slogan", e.target.value)} />
              </div>
              <div style={{ marginTop: 16 }}>
                <Textarea label="Descripción" value={settings.description ?? ""} onChange={e => update("description", e.target.value)} maxLength={500} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Imágenes de marca" description="JPG, PNG o WebP. Máximo 5 MB." />
            <CardContent>
              <div className="branding-upload-grid">
                {(Object.keys(images) as ImageKey[]).map(key => (
                  <ImageUploadField
                    key={key}
                    label={images[key].label}
                    description={images[key].description}
                    previewUrl={imageUrls[key]}
                    loading={uploading === key}
                    disabled={uploading !== null}
                    onSelect={file => uploadImage(key, file)}
                    onRemove={() => removeImage(key)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Apariencia" />
            <CardContent>
              <div className="ui-form-grid">
                <Select label="Tema" value={settings.theme} onChange={e => update("theme", e.target.value as ThemeMode)}>
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                  <option value="auto">Automático</option>
                </Select>
                <Select label="Tipografía" value={settings.font_family} onChange={e => update("font_family", e.target.value)}>
                  <option>Inter</option><option>Roboto</option><option>Poppins</option><option>Montserrat</option>
                </Select>
              </div>
              <div style={{ marginTop: 24 }}>
  <BrandColorEditor
    value={currentColors}
    onChange={updateColors}
  />
</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Información pública" />
            <CardContent>
              <div className="ui-form-grid">
                <Input label="WhatsApp" value={settings.whatsapp ?? ""} onChange={e => update("whatsapp", e.target.value)} />
                <Input label="Correo electrónico" type="email" value={settings.email ?? ""} onChange={e => update("email", e.target.value)} />
                <Input label="Sitio web" type="url" value={settings.website ?? ""} onChange={e => update("website", e.target.value)} />
                <Input label="Instagram" value={settings.instagram ?? ""} onChange={e => update("instagram", e.target.value)} />
                <Input label="Facebook" value={settings.facebook ?? ""} onChange={e => update("facebook", e.target.value)} />
                <Input label="TikTok" value={settings.tiktok ?? ""} onChange={e => update("tiktok", e.target.value)} />
              </div>
              <div style={{ marginTop: 16 }}>
                <Input label="Dirección" value={settings.address ?? ""} onChange={e => update("address", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="branding-mobile-save">
            <Button type="submit" loading={saving} size="lg" style={{ width: "100%" }}>Guardar cambios</Button>
          </div>
        </div>

        <aside className="branding-preview-column">
          <div className="branding-preview-sticky">
            <span className="branding-preview-label">Vista previa</span>
            <div className={`branding-preview branding-preview-${settings.theme}`}>
              <div className="branding-preview-sidebar">
                <div className="branding-preview-logo">
                  {imageUrls.logoSmall || imageUrls.logo ? (
                    <img src={imageUrls.logoSmall || imageUrls.logo || ""} alt="" />
                  ) : settings.business_name.slice(0,2).toUpperCase()}
                </div>
              </div>
              <div className="branding-preview-content">
                <header><div><strong>{settings.business_name}</strong><small>{settings.slogan || "Gestión gastronómica"}</small></div></header>
                {imageUrls.banner && <div className="branding-preview-banner" style={{ backgroundImage: `url("${imageUrls.banner}")` }} />}
                <main><div className="branding-preview-kpis"><article/><article/><article/></div><section/></main>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </>
  );
}
