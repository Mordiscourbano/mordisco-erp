"use client";

import { Button } from "@/components/ui";

export type BrandColors = {
  primary: string;
  secondary: string;
  sidebar: string;
  accent: string;
};

const DEFAULT_COLORS: BrandColors = {
  primary: "#F4B400",
  secondary: "#111827",
  sidebar: "#111827",
  accent: "#F4B400",
};

const PRESETS = [
  ["Mordisco", "Negro y amarillo", DEFAULT_COLORS],
  ["Premium", "Negro y dorado", { primary:"#D4A017", secondary:"#171717", sidebar:"#101010", accent:"#E7C65B" }],
  ["Fuego", "Rojo gastronómico", { primary:"#E63946", secondary:"#1D1D1F", sidebar:"#18181B", accent:"#FF6B35" }],
  ["Natural", "Verde y crema", { primary:"#3A7D44", secondary:"#183A1D", sidebar:"#14281D", accent:"#F0A202" }],
  ["Océano", "Azul moderno", { primary:"#2563EB", secondary:"#0F172A", sidebar:"#111827", accent:"#38BDF8" }],
  ["Violeta", "Creativo y moderno", { primary:"#7C3AED", secondary:"#24153D", sidebar:"#1D1530", accent:"#C084FC" }],
] as const;

const HEX = /^#[0-9A-Fa-f]{6}$/;

function ColorControl({
  label, description, value, onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const pickerValue = HEX.test(value) ? value : "#000000";
  return (
    <label className="brand-color-control">
      <span className="brand-color-swatch">
        <input type="color" value={pickerValue} onChange={e => onChange(e.target.value.toUpperCase())} />
      </span>
      <span className="brand-color-copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        className={`brand-color-hex ${HEX.test(value) ? "" : "invalid"}`}
        value={value}
        maxLength={7}
        onChange={e => onChange(e.target.value)}
        onBlur={e => {
          const raw = e.target.value.trim();
          const next = raw.startsWith("#") ? raw : `#${raw}`;
          onChange(HEX.test(next) ? next.toUpperCase() : value);
        }}
      />
    </label>
  );
}

export function BrandColorEditor({
  value,
  onChange,
}: {
  value: BrandColors;
  onChange: (colors: BrandColors) => void;
}) {
  function update(key: keyof BrandColors, color: string) {
    onChange({ ...value, [key]: color });
  }

  return (
    <div className="brand-color-editor">
      <div className="brand-color-controls">
        <ColorControl label="Color principal" description="Botones y selección activa." value={value.primary} onChange={v => update("primary", v)} />
        <ColorControl label="Color secundario" description="Contraste y texto principal." value={value.secondary} onChange={v => update("secondary", v)} />
        <ColorControl label="Color del menú" description="Fondo del menú lateral." value={value.sidebar} onChange={v => update("sidebar", v)} />
        <ColorControl label="Color de acento" description="Foco, enlaces e indicadores." value={value.accent} onChange={v => update("accent", v)} />
      </div>

      <div className="brand-preset-heading">
        <div>
          <strong>Paletas rápidas</strong>
          <p>Elegí una base y después ajustá los colores.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => onChange(DEFAULT_COLORS)}>
          Restaurar Mordisco
        </Button>
      </div>

      <div className="brand-preset-grid">
        {PRESETS.map(([name, description, colors]) => (
          <button type="button" className="brand-preset-card" key={name} onClick={() => onChange(colors)}>
            <span className="brand-preset-colors">
              <i style={{background: colors.primary}} />
              <i style={{background: colors.secondary}} />
              <i style={{background: colors.sidebar}} />
              <i style={{background: colors.accent}} />
            </span>
            <span><strong>{name}</strong><small>{description}</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}
