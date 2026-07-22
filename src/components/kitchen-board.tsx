'use client';

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Item = {
  quantity: number;
  products: { name: string } | null;
};

type Order = {
  id: string;
  order_number: number;
  channel: string;
  customer_name: string | null;
  note: string | null;
  created_at: string;
  kitchen_status: string;
  order_items: Item[];
};

function minutesSince(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
}

function urgencyClass(minutes: number) {
  if (minutes >= 15) return "kds-critical";
  if (minutes >= 12) return "kds-danger";
  if (minutes >= 8) return "kds-warning";
  return "kds-normal";
}

export function KitchenBoard({ initial }: { initial: Order[] }) {
  const [orders, setOrders] = useState(initial);
  const [, setTick] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => window.location.reload()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const visible = useMemo(
    () =>
      orders
        .filter((o) => ["pending", "preparing", "ready"].includes(o.kitchen_status))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [orders]
  );

  async function changeStatus(orderId: string, status: string) {
    const { error } = await createClient().rpc("update_kitchen_status", {
      p_order_id: orderId,
      p_status: status,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, kitchen_status: status } : order
      )
    );
  }

  return (
    <>
      <div className="kds-header">
        <div>
          <h1>Kitchen Display</h1>
          <p>{visible.length} pedidos activos</p>
        </div>
        {message && <div className="error">{message}</div>}
      </div>

      <div className="kds-grid">
        {visible.map((order) => {
          const mins = minutesSince(order.created_at);
          return (
            <article
              key={order.id}
              className={`kds-card ${urgencyClass(mins)} status-${order.kitchen_status}`}
            >
              <header>
                <strong>Pedido #{order.order_number}</strong>
                <span>{mins} min</span>
              </header>

              <div className="kds-meta">
                <span>{order.channel}</span>
                <span>{order.customer_name || "Sin cliente"}</span>
              </div>

              <div className="kds-items">
                {order.order_items.map((item, index) => (
                  <div key={index}>
                    <strong>{item.quantity}×</strong>
                    <span>{item.products?.name ?? "Producto"}</span>
                  </div>
                ))}
              </div>

              {order.note && <div className="kds-note">{order.note}</div>}

              <footer>
                {order.kitchen_status === "pending" && (
                  <button onClick={() => changeStatus(order.id, "preparing")}>
                    Empezar
                  </button>
                )}
                {order.kitchen_status === "preparing" && (
                  <button onClick={() => changeStatus(order.id, "ready")}>
                    Marcar listo
                  </button>
                )}
                {order.kitchen_status === "ready" && (
                  <button onClick={() => changeStatus(order.id, "delivered")}>
                    Entregado
                  </button>
                )}
              </footer>
            </article>
          );
        })}
      </div>
    </>
  );
}
