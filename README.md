# Mordisco ERP

Proyecto inicial del ERP gastronómico de Mordisco Urbano.

## Cómo iniciar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abrir http://localhost:3000.

## Supabase

Ejecutar `supabase/schema.sql` y luego `supabase/seed.sql`.
Nunca subir `.env.local` ni claves privadas.
