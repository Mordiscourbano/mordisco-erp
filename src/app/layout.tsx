import Link from "next/link";
import "./globals.css";
import "./sprint-7.css";
import "./sprint-7-1.css";
import "./sprint-8.css";
import "./sprint-9.css";
import "./sprint-10.css";
import "./sprint-10-1.css";
import { LogoutButton } from "@/components/logout-button";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <header className="header">
          <div className="header-inner">
            <div>
              <h1>Mordisco ERP</h1>
              <p>
                Gestión, ventas, clientes, fidelización e inteligencia
              </p>
            </div>
            <LogoutButton />
          </div>
        </header>

        <nav className="nav">
          <div className="nav-inner">
            <Link href="/">Inicio</Link>
            <Link href="/inteligencia">Intelligence</Link>
            <Link href="/automatizaciones">Automatizaciones</Link>
            <Link href="/notificaciones">Notificaciones</Link>
            <Link href="/pos">POS</Link>
            <Link href="/fidelizacion">Fidelización</Link>
            <Link href="/canjes">Canjes</Link>
            <Link href="/cocina">Cocina</Link>
            <Link href="/cocina/metricas">Métricas cocina</Link>
            <Link href="/pedidos">Pedidos</Link>
            <Link href="/caja">Caja</Link>
            <Link href="/crm">CRM</Link>
            <Link href="/clientes">Clientes</Link>
            <Link href="/promociones">Promociones</Link>
            <Link href="/compras">Compras</Link>
            <Link href="/proveedores">Proveedores</Link>
            <Link href="/ingredientes">Ingredientes</Link>
            <Link href="/productos">Productos</Link>
            <Link href="/recetas">Recetas</Link>
            <Link href="/costos">Costos</Link>
            <Link href="/inventario">Inventario</Link>
          </div>
        </nav>

        <main className="main">{children}</main>
      </body>
    </html>
  );
}
