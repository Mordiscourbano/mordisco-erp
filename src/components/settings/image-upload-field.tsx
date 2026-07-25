'use client';

import { ChangeEvent, useRef, useState } from "react";
import { Button } from "@/components/ui";

export function ImageUploadField({
  label,
  description,
  previewUrl,
  loading = false,
  disabled = false,
  onSelect,
  onRemove,
}: {
  label: string;
  description: string;
  previewUrl?: string | null;
  loading?: boolean;
  disabled?: boolean;
  onSelect: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      throw new Error("Usá una imagen JPG, PNG o WebP.");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("La imagen supera el máximo de 5 MB.");
    }
    const url = URL.createObjectURL(file);
    setLocalPreview(url);
    try {
      await onSelect(file);
    } finally {
      setLocalPreview(null);
      URL.revokeObjectURL(url);
    }
  }

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    await handleFile(event.target.files?.[0]);
    event.target.value = "";
  }

  const shown = localPreview || previewUrl || null;

  return (
    <section className="branding-image-field">
      <div className="branding-image-preview">
        {shown ? <img src={shown} alt={label} /> : <span>＋</span>}
      </div>
      <div className="branding-image-copy">
        <strong style={{ color: "#111827" }}>
  {label}
</strong>

<p style={{ color: "#475467" }}>
  {description}
</p>

<div className="branding-image-actions">
  <input
    ref={inputRef}
    hidden
    type="file"
    accept="image/png,image/jpeg,image/webp"
    onChange={onChange}
  />

  <Button
    type="button"
    size="sm"
    variant="secondary"
    loading={loading}
    disabled={disabled}
    style={{
      color: "#111827",
      background: "#ffffff",
    }}
    onClick={() => inputRef.current?.click()}
  >
    {shown ? "Reemplazar" : "Seleccionar imagen"}
  </Button>

  {shown && onRemove && (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={disabled || loading}
      style={{ color: "#111827" }}
      onClick={onRemove}
    >
      Quitar
    </Button>
  )}
</div>
