# Mordisco ERP — Sprint 9 Intelligence

Incluye:

- Pronóstico de ventas de los próximos 7 días.
- Riesgo de faltantes y días estimados de stock.
- Compra recomendada por ingrediente.
- Productos que conviene subir, promocionar, proteger o revisar.
- Clientes VIP, inactivos, con cumpleaños o puntos para canjear.
- Alertas y recomendaciones de cocina.
- Panel ejecutivo de decisiones.

## Instalación

1. Crear desde `main`:

```text
sprint-9-intelligence
```

2. Ejecutar en Supabase:

```text
supabase/sprint-9-intelligence.sql
```

3. Subir a GitHub:

- `src`
- `supabase`
- `README.md`

Commit:

```text
Sprint 9: Mordisco Intelligence
```

4. No hay que copiar CSS. `layout.tsx` importa `sprint-9.css`.

5. Probar:

```text
/inteligencia
```

## Importante

El pronóstico usa promedios históricos por día de la semana. No es IA generativa ni una garantía de ventas. Es un sistema de recomendaciones basado en los datos reales registrados en Mordisco ERP.
