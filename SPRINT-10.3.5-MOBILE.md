# Sprint 10.3.5 — App móvil PWA

Esta versión fue integrada sobre el proyecto real de Mordisco ERP.

## Incluye

- Aplicación instalable en Android, iPhone/iPad y escritorio compatible.
- Manifest PWA nativo de Next.js.
- Iconos normales, Apple y maskable.
- Registro de Service Worker.
- Pantalla estática sin conexión.
- Aviso guiado de instalación.
- Página `/install` con instrucciones según dispositivo.
- Accesos rápidos a POS, Cocina e Inventario.
- Respeto por ThemeProvider, Branding y AppShell existentes.

## No requiere

- Cambios SQL.
- Nuevas dependencias npm.
- Modificaciones en Supabase.

## Pruebas después del deploy

1. Abrir `/install` desde Android con Chrome.
2. Usar `⋮ → Instalar aplicación`.
3. En iPhone abrir con Safari y usar `Compartir → Agregar a pantalla de inicio`.
4. Abrir la app desde el icono instalado.
5. Verificar POS, Cocina, Stock, menú inferior y cierre de sesión.

El Service Worker no almacena páginas privadas ni respuestas de Supabase; solo
conserva los iconos y la pantalla sin conexión.
