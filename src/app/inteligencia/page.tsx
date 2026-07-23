import { IntelligenceForecast } from "@/components/intelligence-forecast";
import { createClient } from "@/lib/supabase/server";

const money = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const number = (value: number) =>
  Number(value || 0).toLocaleString("es-AR", { maximumFractionDigits: 1 });

export default async function IntelligencePage() {
  const supabase = await createClient();

  const [
    { data: forecast, error: forecastError },
    { data: stockRisks },
    { data: productActions },
    { data: customerActions },
    { data: kitchenActions },
  ] = await Promise.all([
    supabase.rpc("intelligence_sales_forecast", {
      p_history_days: 28,
      p_forecast_days: 7,
    }),
    supabase.rpc("intelligence_stock_risk", { p_history_days: 28 }),
    supabase.rpc("intelligence_product_actions", { p_days: 30 }),
    supabase.rpc("intelligence_customer_actions"),
    supabase.rpc("intelligence_kitchen_actions", { p_days: 14 }),
  ]);

  if (forecastError) {
    return <div className="error">{forecastError.message}</div>;
  }

  const criticalStock = (stockRisks ?? []).filter(
    (item: any) => item.risk_level === "critical"
  );
  const warningStock = (stockRisks ?? []).filter(
    (item: any) => item.risk_level === "warning"
  );
  const urgentProducts = (productActions ?? []).filter(
    (item: any) => ["raise_price", "review"].includes(item.action_type)
  );
  const customerOpportunities = (customerActions ?? []).filter(
    (item: any) => item.action_type !== "monitor"
  );

  const expectedWeekRevenue = (forecast ?? []).reduce(
    (sum: number, day: any) => sum + Number(day.expected_revenue || 0),
    0
  );

  return (
    <>
      <div className="intel-heading">
        <div>
          <h1 className="page-title">Mordisco Intelligence</h1>
          <p className="page-subtitle">
            Recomendaciones basadas en ventas, stock, clientes y cocina.
          </p>
        </div>
        <span className="intel-note">
          Pronóstico estadístico simple basado en los últimos 28 días.
        </span>
      </div>

      <section className="grid kpis intel-kpis">
        <article className="card">
          <span>Facturación esperada · 7 días</span>
          <strong>{money(expectedWeekRevenue)}</strong>
        </article>
        <article className="card">
          <span>Stock crítico</span>
          <strong>{criticalStock.length}</strong>
        </article>
        <article className="card">
          <span>Stock en advertencia</span>
          <strong>{warningStock.length}</strong>
        </article>
        <article className="card">
          <span>Productos a revisar</span>
          <strong>{urgentProducts.length}</strong>
        </article>
        <article className="card">
          <span>Oportunidades CRM</span>
          <strong>{customerOpportunities.length}</strong>
        </article>
      </section>

      <section className="panel">
        <h2>Pronóstico de ventas</h2>
        <p className="page-subtitle">
          Promedio histórico del mismo día de la semana.
        </p>
        <IntelligenceForecast data={forecast ?? []} />
      </section>

      <section className="intel-columns">
        <article className="panel">
          <h2>Prioridad de compras</h2>
          <div className="intel-list">
            {(stockRisks ?? []).slice(0, 12).map((item: any) => (
              <div className={`intel-action intel-${item.risk_level}`} key={item.ingredient_id}>
                <div>
                  <strong>{item.ingredient_name}</strong>
                  <span>
                    Stock: {number(item.current_quantity)} {item.base_unit}
                    {item.estimated_days_remaining !== null
                      ? ` · ${number(item.estimated_days_remaining)} días`
                      : ""}
                  </span>
                </div>
                <div className="intel-action-right">
                  <span>Comprar</span>
                  <strong>{number(item.recommended_purchase)}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Acciones sobre productos</h2>
          <div className="intel-list">
            {(productActions ?? []).slice(0, 12).map((item: any) => (
              <div className={`intel-action action-${item.action_type}`} key={item.product_id}>
                <div>
                  <strong>{item.product_name}</strong>
                  <span>
                    {number(item.units_sold)} unidades · margen {number(item.estimated_margin)}%
                  </span>
                  <p>{item.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="intel-columns">
        <article className="panel">
          <h2>Oportunidades con clientes</h2>
          <div className="intel-list">
            {customerOpportunities.slice(0, 12).map((item: any) => (
              <div className={`intel-action customer-${item.action_type}`} key={item.customer_id}>
                <div>
                  <strong>{item.full_name}</strong>
                  <span>
                    {item.customer_segment} · {item.loyalty_points} puntos · {money(item.total_spent)}
                  </span>
                  <p>{item.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Cocina</h2>
          <div className="intel-list">
            {(kitchenActions ?? []).map((item: any) => (
              <div className="intel-action" key={item.observation_type}>
                <div>
                  <strong>{item.observation_type.replaceAll("_", " ")}</strong>
                  <span>{number(item.metric_value)}</span>
                  <p>{item.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel intel-disclaimer">
        <h2>Cómo interpretar estas recomendaciones</h2>
        <p>
          Este módulo utiliza reglas y promedios de tus propios datos. No es una
          predicción garantizada. Las recomendaciones mejoran cuando se registran
          ventas, compras, movimientos, clientes y tiempos de cocina de manera constante.
        </p>
      </section>
    </>
  );
}
