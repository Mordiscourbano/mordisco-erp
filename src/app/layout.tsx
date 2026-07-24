import "./globals.css";
import "./design-system.css";
import { AppShell } from "@/components/app-shell";

export const metadata = {
  title: "Mordisco ERP",
  description: "Gestión gastronómica integral",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
