# Mordisco ERP — Sprint 1

Incluye login, dashboard conectado y edición online de ingredientes y productos.

## Pasos

1. En Supabase ejecutá `supabase/sprint-1-auth.sql`.
2. Creá un usuario en Authentication → Users.
3. Copiá su UUID.
4. Editá `supabase/link-owner.sql`, reemplazá `TU_USER_UUID` y ejecutalo.
5. Creá `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
```

6. Ejecutá:

```bash
npm install
npm run dev
```

7. Subí estos archivos a GitHub y desplegá en Vercel.
