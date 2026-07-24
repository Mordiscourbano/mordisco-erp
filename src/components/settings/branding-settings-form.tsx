'use client';

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BusinessSettings, BusinessSettingsUpdate, ThemeMode } from "@/lib/settings/types";
import { Alert, Button, Card, CardContent, CardHeader, Input, PageHeader, Select, Textarea } from "@/components/ui";

const FONT_OPTIONS = ["Inter", "Roboto", "Poppins", "Montserrat"];

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="branding-color-field">
      <label>{label}</label>
      <div className="branding-color-control">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} />
        <input value={value} onChange={(event) => onChange(event.target.value)} maxLength={7} pattern="^#[0-9A-Fa-f]{6}$" />
      </div>
    </div>
  );
}

export function BrandingSettingsForm({ initialSettings }: { initialSettings: BusinessSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  const previewStyle = useMemo(() => ({
    "--preview-primary": settings.primary_color,
    "--preview-secondary": settings.secondary_color,
    "--preview-sidebar": settings.sidebar_color,
    "--preview-accent": settings.accent_color,
    "--preview-font": settings.font_family,
  }) as React.CSSProperties, [settings]);

  function update<K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
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
    setMessage({ type: "success", text: "La configuración se guardó correctamente." });
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
            <CardHeader title="Identidad del negocio" description="Información principal que utilizarán el ERP, la tienda y las futuras aplicaciones." />
            <CardContent>
              <div className="ui-form-grid">
                <Input label="Nombre comercial" value={settings.business_name} onChange={(event) => update("business_name", event.target.value)} required />
                <Input label="Eslogan" value={settings.slogan ?? ""} onChange={(event) => update("slogan", event.target.value)} placeholder="Hamburguesas que dejan huella" />
              </div>
              <div style={{ marginTop: 16 }}>
                <Textarea label="Descripción" value={settings.description ?? ""} onChange={(event) => update("description", event.target.value)} placeholder="Contá brevemente qué hace especial a tu negocio..." maxLength={500} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Imágenes de marca" description="La subida de archivos se habilitará en la siguiente entrega." />
            <CardContent>
              <div className="branding-upload-grid">
                {[
                  ["Logo principal", "Se usará en el login y encabezados."],
                  ["Logo reducido", "Se usará en el menú contraído y favicon."],
                  ["Banner", "Portada para catálogo y comunicaciones."],
                  ["Imagen de fondo", "Fondo opcional para login y portada."],
                ].map(([title, description]) => (
                  <div className="branding-upload-placeholder" key={title}>
                    <div className="branding-upload-icon">＋</div>
                    <strong>{title}</strong>
                    <span>{description}</span>
                    <Button type="button" variant="secondary" size="sm" disabled>Subir imagen</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Apariencia" description="Definí el tema, los colores y la tipografía del sistema." />
            <CardContent>
              <div className="ui-form-grid">
                <Select label="Tema" value={settings.theme} onChange={(event) => update("theme", event.target.value as ThemeMode)}>
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                  <option value="auto">Automático</option>
                </Select>
                <Select label="Tipografía" value={settings.font_family} onChange={(event) => update("font_family", event.target.value)}>
                  {FONT_OPTIONS.map((font) => <option value={font} key={font}>{font}</option>)}
                </Select>
              </div>
              <div className="branding-colors-grid">
                <ColorField label="Color principal" value={settings.primary_color} onChange={(value) => update("primary_color", value)} />
                <ColorField label="Color secundario" value={settings.secondary_color} onChange={(value) => update("secondary_color", value)} />
                <ColorField label="Color del menú" value={settings.sidebar_color} onChange={(value) => update("sidebar_color", value)} />
                <ColorField label="Color de acento" value={settings.accent_color} onChange={(value) => update("accent_color", value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Información pública" description="Datos que podrán reutilizarse en la tienda, WhatsApp y comunicaciones." />
            <CardContent>
              <div className="ui-form-grid">
                <Input label="WhatsApp" value={settings.whatsapp ?? ""} onChange={(event) => update("whatsapp", event.target.value)} placeholder="+54 9 11..." />
                <Input label="Correo electrónico" type="email" value={settings.email ?? ""} onChange={(event) => update("email", event.target.value)} />
                <Input label="Sitio web" type="url" value={settings.website ?? ""} onChange={(event) => update("website", event.target.value)} placeholder="https://mordiscourbano.com" />
                <Input label="Instagram" value={settings.instagram ?? ""} onChange={(event) => update("instagram", event.target.value)} placeholder="@mordiscourbano" />
                <Input label="Facebook" value={settings.facebook ?? ""} onChange={(event) => update("facebook", event.target.value)} />
                <Input label="TikTok" value={settings.tiktok ?? ""} onChange={(event) => update("tiktok", event.target.value)} />
              </div>
              <div style={{ marginTop: 16 }}>
                <Input label="Dirección" value={settings.address ?? ""} onChange={(event) => update("address", event.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="branding-mobile-save">
            <Button type="submit" fullWidth loading={saving} size="lg">Guardar cambios</Button>
          </div>
        </div>

        <aside className="branding-preview-column">
          <div className="branding-preview-sticky">
            <span className="branding-preview-label">Vista previa</span>
            <div className={`branding-preview branding-preview-${settings.theme}`} style={previewStyle}>
              <div className="branding-preview-sidebar">
                <div className="branding-preview-logo">{settings.business_name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase()}</div>
                <span /><span /><span /><span />
              </div>
              <div className="branding-preview-content">
                <header>
                  <div><strong>{settings.business_name}</strong><small>{settings.slogan || "Gestión gastronómica"}</small></div>
                  <i />
                </header>
                <main>
                  <div className="branding-preview-title" />
                  <div className="branding-preview-kpis"><article /><article /><article /></div>
                  <section />
                </main>
              </div>
            </div>
            <p className="branding-preview-help">Esta vista es orientativa. En la B.3 los colores se aplicarán dinámicamente a todo el ERP.</p>
          </div>
        </aside>
      </form>
    </>
  );
}
