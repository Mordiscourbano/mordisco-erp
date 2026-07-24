"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ThemeMode } from "@/lib/settings/types";

export type RuntimeBranding = {
  businessName: string;
  slogan: string | null;
  logoUrl: string | null;
  logoSmallUrl: string | null;
  backgroundUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  sidebarColor: string;
  accentColor: string;
  fontFamily: string;
  theme: ThemeMode;
};

export function ThemeProvider({
  branding,
  children,
}: {
  branding: RuntimeBranding;
  children: ReactNode;
}) {
  const style = {
    "--brand-primary": branding.primaryColor,
    "--brand-secondary": branding.secondaryColor,
    "--brand-sidebar": branding.sidebarColor,
    "--brand-accent": branding.accentColor,
    "--brand-font": branding.fontFamily,
    "--brand-background-image": branding.backgroundUrl
      ? `url("${branding.backgroundUrl}")`
      : "none",
  } as CSSProperties;

  return (
    <div
      className={`brand-runtime brand-theme-${branding.theme}`}
      style={style}
    >
      {children}
    </div>
  );
}
