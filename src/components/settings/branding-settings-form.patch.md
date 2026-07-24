
# Cambios en `src/components/settings/branding-settings-form.tsx`

## 1. Agregar este import

```tsx
import {
  BrandColorEditor,
  type BrandColors,
} from "./brand-color-editor";
```

## 2. Dentro del componente agregar

```tsx
const currentColors: BrandColors = {
  primary: settings.primary_color,
  secondary: settings.secondary_color,
  sidebar: settings.sidebar_color,
  accent: settings.accent_color,
};

function updateColors(colors: BrandColors) {
  setSettings((current) => ({
    ...current,
    primary_color: colors.primary,
    secondary_color: colors.secondary,
    sidebar_color: colors.sidebar,
    accent_color: colors.accent,
  }));
}
```

## 3. Dentro de la tarjeta `Apariencia`, debajo de Tema y Tipografía, agregar

```tsx
<div className="brand-color-section">
  <div className="brand-color-section-heading">
    <h3>Colores de marca</h3>
    <p>Los cambios se ven inmediatamente. Guardalos para conservarlos.</p>
  </div>

  <BrandColorEditor
    value={currentColors}
    onChange={updateColors}
  />
</div>
```

Si todavía existen los controles viejos de color, eliminarlos para evitar duplicados.
