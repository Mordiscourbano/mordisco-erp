import { createClient } from "@/lib/supabase/server";

const money = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default async function RedemptionsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
  .from("loyalty_redemptions")
  .select(
    "id,points_spent,discount_amount,status,created_at,customers(full_name),loyalty_rewards(name,reward_type),orders!loyalty_redemptions_order_id_fkey(order_number,total)"
  )
  .order("created_at", { ascending: false })
  .limit(250);

  if (error) {
    return <div className="error">{error.message}</div>;
  }

  return (
    <>
      <h1 className="page-title">Historial de canjes</h1>
      <p className="page-subtitle">
        Premios utilizados y puntos descontados.
      </p>

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Premio</th>
                <th>Pedido</th>
                <th>Puntos</th>
                <th>Beneficio</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>
              {(data ?? []).map((item: any) => (
                <tr key={item.id}>
                  <td>
                    {new Date(item.created_at).toLocaleString(
                      "es-AR"
                    )}
                  </td>
                  <td>{item.customers?.full_name ?? "—"}</td>
                  <td>{item.loyalty_rewards?.name ?? "—"}</td>
                  <td>
                    {item.orders?.order_number
                      ? `#${item.orders.order_number}`
                      : "—"}
                  </td>
                  <td>-{item.points_spent}</td>
                  <td>{money(item.discount_amount)}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
