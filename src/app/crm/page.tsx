import Link from "next/link";
import { LoyaltyAdjuster } from "@/components/loyalty-adjuster";
import { createClient } from "@/lib/supabase/server";

const money = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default async function CrmPage() {
  const supabase = await createClient();

  const [{ data: summary, error }, { data: insightRows }] = await Promise.all([
    supabase.rpc("customer_summary"),
    supabase.rpc("crm_insights"),
  ]);

  if (error) return <div className="error">{error.message}</div>;

  const insights = insightRows?.[0] ?? {
    total_customers: 0,
    vip_customers: 0,
    birthday_next_30_days: 0,
    inactive_customers: 0,
    customers_with_points: 0,
  };

  return (
    <>
      <div className="toolbar">
        <div>
          <h1 className="page-title">CRM y fidelización</h1>
          <p className="page-subtitle">
            Clientes, puntos, segmentación y oportunidades comerciales.
          </p>
        </div>
        <div className="actions">
          <Link className="btn secondary" href="/promociones">
            Promociones
          </Link>
          <Link className="btn" href="/clientes">
            Gestionar clientes
          </Link>
        </div>
      </div>

      <section className="grid kpis crm-kpis">
        <article className="card">
          <span>Clientes</span>
          <strong>{insights.total_customers}</strong>
        </article>
        <article className="card">
          <span>Clientes VIP</span>
          <strong>{insights.vip_customers}</strong>
        </article>
        <article className="card">
          <span>Cumpleaños próximos</span>
          <strong>{insights.birthday_next_30_days}</strong>
        </article>
        <article className="card">
          <span>Clientes inactivos</span>
          <strong>{insights.inactive_customers}</strong>
        </article>
        <article className="card">
          <span>Con puntos disponibles</span>
          <strong>{insights.customers_with_points}</strong>
        </article>
      </section>

      <section className="panel">
        <h2>Ranking de clientes</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Segmento</th>
                <th>Pedidos</th>
                <th>Consumo</th>
                <th>Ticket</th>
                <th>Puntos</th>
                <th>Última compra</th>
              </tr>
            </thead>
            <tbody>
              {(summary ?? []).map((customer: any) => (
                <tr key={customer.customer_id}>
                  <td>
                    <strong>{customer.full_name}</strong>
                    <small className="crm-subtitle">{customer.phone || customer.email || "Sin contacto"}</small>
                  </td>
                  <td>
                    <span className={`crm-segment segment-${String(customer.customer_segment).toLowerCase()}`}>
                      {customer.customer_segment}
                    </span>
                  </td>
                  <td>{customer.orders_count}</td>
                  <td>{money(customer.total_spent)}</td>
                  <td>{money(customer.average_ticket)}</td>
                  <td>{customer.loyalty_points}</td>
                  <td>
                    {customer.last_order_at
                      ? new Date(customer.last_order_at).toLocaleDateString("es-AR")
                      : "Sin compras"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Ajuste de puntos</h2>
        <div className="loyalty-grid">
          {(summary ?? []).slice(0, 20).map((customer: any) => (
            <LoyaltyAdjuster
              key={customer.customer_id}
              customerId={customer.customer_id}
              customerName={customer.full_name}
            />
          ))}
        </div>
      </section>
    </>
  );
}
