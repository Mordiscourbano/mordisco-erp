# Mordisco ERP — Sprint 10.1

## Fidelización configurable y canjes en POS

Incluye:

- Regla editable de pesos por punto.
- Compra mínima para acumular.
- Configuración futura de vencimiento.
- Catálogo de premios.
- Producto gratis.
- Descuento fijo.
- Descuento porcentual.
- Canje directamente desde el POS.
- Validación segura de puntos.
- Descuento automático del saldo.
- Historial de canjes.
- Los puntos nuevos se calculan sobre el total final después del canje.

## Regla inicial

```text
$1.000 = 1 punto
Sin vencimiento
```

## Instalación

1. Crear desde `main`:

```text
sprint-10-1-loyalty
```

2. Ejecutar en Supabase:

```text
supabase/sprint-10-1-loyalty.sql
```

3. Subir:

- `src`
- `supabase`
- `README.md`

4. Commit:

```text
Sprint 10.1: Fidelización y Canjes
```

5. No hay que copiar CSS manualmente.

## Prueba recomendada

1. Abrir `/fidelizacion`.
2. Crear premio “Papas chicas” por 50 puntos.
3. Ajustar un cliente a más de 50 puntos desde CRM.
4. Abrir `/pos`.
5. Seleccionar al cliente.
6. Elegir el premio.
7. Registrar la venta.
8. Revisar `/canjes`.
9. Confirmar que los puntos bajaron y que el pedido muestra el descuento.
