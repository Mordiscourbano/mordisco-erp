"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import type { RuntimeBranding } from "@/components/branding/theme-provider";

const groups = [
  ["Resumen", [["/", "Inicio", "⌂"], ["/inteligencia", "Intelligence", "✦"], ["/notificaciones", "Notificaciones", "●"]]],
  ["Ventas", [["/pos", "Punto de venta", "▣"], ["/pedidos", "Pedidos", "≡"], ["/caja", "Caja", "$"], ["/canjes", "Canjes", "★"]]],
  ["Operación", [["/cocina", "Cocina", "♨"], ["/cocina/metricas", "Métricas cocina", "▥"], ["/inventario", "Inventario", "▦"], ["/movimientos", "Movimientos", "⇄"], ["/compras", "Compras", "⌑"], ["/proveedores", "Proveedores", "▱"]]],
  ["Catálogo", [["/productos", "Productos", "◉"], ["/ingredientes", "Ingredientes", "⌁"], ["/recetas", "Recetas", "▤"], ["/costos", "Costos", "∑"]]],
  ["Clientes", [["/crm", "CRM", "◎"], ["/clientes", "Clientes", "◌"], ["/fidelizacion", "Fidelización", "☆"], ["/promociones", "Promociones", "%"], ["/automatizaciones", "Automatizaciones", "➤"]]],
  ["Sistema", [["/plantillas", "Plantillas", "□"], ["/comunicaciones", "Comunicaciones", "✉"], ["/configuracion", "Configuración", "⚙"]]],
] as const;

function active(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppShell({
  children,
  branding,
}: {
  children: React.ReactNode;
  branding: RuntimeBranding;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div
        className={`mobile-overlay ${mobileOpen ? "visible" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            {branding.logoSmallUrl || branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logoSmallUrl || branding.logoUrl || ""}
                alt={branding.businessName}
              />
            ) : (
              initials(branding.businessName)
            )}
          </div>

          <div className="brand-copy">
            <strong>{branding.businessName}</strong>
            <span>{branding.slogan || "Gestión gastronómica"}</span>
          </div>

          <button
            className="sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>

        <nav className="sidebar-nav">
          {groups.map(([label, items]) => (
            <section className="nav-group" key={label}>
              <span className="nav-group-label">{label}</span>

              {items.map(([href, itemLabel, icon]) => (
                <Link
                  className={`sidebar-link ${
                    active(pathname, href) ? "active" : ""
                  }`}
                  href={href}
                  key={href}
                >
                  <span className="nav-icon">{icon}</span>
                  <span>{itemLabel}</span>
                </Link>
              ))}
            </section>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="collapse-button"
            onClick={() => setCollapsed(!collapsed)}
          >
            <span>{collapsed ? "→" : "←"}</span>
            <span>Contraer menú</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
            >
              <span />
              <span />
              <span />
            </button>

            <div className="topbar-branding">
              {branding.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="topbar-brand-logo"
                  src={branding.logoUrl}
                  alt=""
                />
              )}

              <div>
                <strong className="topbar-title">
                  {branding.businessName}
                </strong>
                <span className="topbar-subtitle">
                  {branding.slogan || "Operación conectada en tiempo real"}
                </span>
              </div>
            </div>
          </div>

          <div className="topbar-actions">
            <Link
              className="topbar-icon-button"
              href="/notificaciones"
              aria-label="Notificaciones"
            >
              ●
            </Link>
            <LogoutButton />
          </div>
        </header>

        <main className="content-area">{children}</main>

        <nav className="mobile-bottom-nav">
          <Link
            className={active(pathname, "/") ? "active" : ""}
            href="/"
          >
            <span>⌂</span>
            <small>Inicio</small>
          </Link>
          <Link
            className={active(pathname, "/pos") ? "active" : ""}
            href="/pos"
          >
            <span>▣</span>
            <small>POS</small>
          </Link>
          <Link
            className={active(pathname, "/cocina") ? "active" : ""}
            href="/cocina"
          >
            <span>♨</span>
            <small>Cocina</small>
          </Link>
          <Link
            className={active(pathname, "/inventario") ? "active" : ""}
            href="/inventario"
          >
            <span>▦</span>
            <small>Stock</small>
          </Link>
          <button onClick={() => setMobileOpen(true)}>
            <span>•••</span>
            <small>Más</small>
          </button>
        </nav>
      </div>
    </div>
  );
}
