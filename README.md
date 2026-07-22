# Mordisco ERP — Sprint 7 PRO

## CRM, fidelización y promociones

Incluye:

- Clientes y datos de contacto.
- Consentimiento para promociones.
- Cumpleaños.
- Puntos de fidelización.
- Segmentación automática: Nuevo, Activo, Frecuente y VIP.
- Ranking por consumo.
- Ticket promedio y última compra.
- Ajustes manuales de puntos.
- Promociones por porcentaje, importe fijo o puntos.
- Indicadores de clientes inactivos y cumpleaños próximos.

## Instalación

1. Crear desde `main`:

```text
sprint-7-crm
```

2. Ejecutar en Supabase:

```text
supabase/sprint-7-crm.sql
```

3. Subir a la rama:

- `src`
- `supabase`
- `README.md`

Commit:

```text
Sprint 7 PRO: CRM y Fidelización
```

4. No hay que copiar CSS manualmente. `layout.tsx` ya importa `sprint-7.css`.

5. Probar en Preview:

- `/crm`
- `/clientes`
- `/promociones`

## Prueba recomendada

1. Crear tres clientes.
2. Activar promociones para uno de ellos.
3. Ajustar puntos desde CRM.
4. Crear una promoción de 10%.
5. Verificar segmentos y métricas.

## Próxima mejora

La vinculación automática del cliente directamente desde el POS y el canje de promociones se incorporará como evolución del módulo de ventas.
