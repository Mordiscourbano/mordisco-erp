import { createClient } from "@/lib/supabase/server";

const n = (value: number) =>
  Number(value || 0).toLocaleString("es-AR", { maximumFractionDigits: 1 });

export default async function KitchenMetricsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("kitchen_metrics", { p_days: 7 });

  if (error) return <div className="error">{error.message}</div>;

  const metrics = data?.[0] ?? {
    completed_orders: 0,
    average_preparation_minutes: 0,
    average_delivery_minutes: 0,
    delayed_orders: 0,
  };

  return (
    <>
      <h1 className="page-title">Métricas de cocina</h1>
      <p className="page-subtitle">Últimos 7 días.</p>

      <section className="grid kpis">
        <article className="card">
          <span>Pedidos completados</span>
          <strong>{metrics.completed_orders}</strong>
        </article>
        <article className="card">
          <span>Preparación promedio</span>
          <strong>{n(metrics.average_preparation_minutes)} min</strong>
        </article>
        <article className="card">
          <span>Espera para entrega</span>
          <strong>{n(metrics.average_delivery_minutes)} min</strong>
        </article>
        <article className="card">
          <span>Pedidos demorados</span>
          <strong>{metrics.delayed_orders}</strong>
        </article>
      </section>
    </>
  );
}
