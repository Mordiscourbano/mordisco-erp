'use client';

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Settings = {
  id: string;
  business_id: string;
  pesos_per_point: number;
  minimum_purchase: number;
  points_expire: boolean;
  expiration_months: number | null;
  active: boolean;
};

type Product = {
  id: string;
  name: string;
};

type Reward = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  reward_type: string;
  points_cost: number;
  product_id: string | null;
  discount_value: number;
  active: boolean;
};

export function LoyaltyAdmin({
  initialSettings,
  initialRewards,
  products,
  businessId,
}: {
  initialSettings: Settings;
  initialRewards: Reward[];
  products: Product[];
  businessId: string;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [rewards, setRewards] = useState(initialRewards);
  const [editReward, setEditReward] = useState<Reward | null>(null);
  const [message, setMessage] = useState("");

  const emptyReward: Reward = {
    id: "",
    business_id: businessId,
    name: "",
    description: "",
    reward_type: "free_product",
    points_cost: 50,
    product_id: products[0]?.id ?? null,
    discount_value: 0,
    active: true,
  };

  async function saveSettings(event: FormEvent) {
    event.preventDefault();

    const { data, error } = await createClient()
      .from("loyalty_settings")
      .upsert({
        ...settings,
        business_id: businessId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "business_id" })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setSettings(data);
    setMessage("Configuración guardada.");
  }

  async function saveReward(event: FormEvent) {
    event.preventDefault();
    if (!editReward) return;

    const payload = {
      business_id: businessId,
      name: editReward.name,
      description: editReward.description || null,
      reward_type: editReward.reward_type,
      points_cost: editReward.points_cost,
      product_id:
        editReward.reward_type === "free_product"
          ? editReward.product_id
          : null,
      discount_value:
        ["fixed_discount", "percentage_discount"].includes(
          editReward.reward_type
        )
          ? editReward.discount_value
          : 0,
      active: editReward.active,
    };

    const supabase = createClient();

    if (editReward.id) {
      const { data, error } = await supabase
        .from("loyalty_rewards")
        .update(payload)
        .eq("id", editReward.id)
        .select()
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }

      setRewards((current) =>
        current.map((reward) =>
          reward.id === editReward.id ? data : reward
        )
      );
    } else {
      const { data, error } = await supabase
        .from("loyalty_rewards")
        .insert(payload)
        .select()
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }

      setRewards((current) => [...current, data]);
    }

    setEditReward(null);
    setMessage("Premio guardado.");
  }

  return (
    <>
      {message && (
        <div
          className={
            message.includes("guardad") ? "success" : "error"
          }
        >
          {message}
        </div>
      )}

      <section className="panel">
        <h2>Regla de acumulación</h2>

        <form onSubmit={saveSettings}>
          <div className="form-grid">
            <div className="field">
              <label>Pesos por punto</label>
              <input
                type="number"
                min="1"
                step="1"
                value={settings.pesos_per_point}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    pesos_per_point: Number(event.target.value),
                  })
                }
              />
            </div>

            <div className="field">
              <label>Compra mínima para sumar</label>
              <input
                type="number"
                min="0"
                step="1"
                value={settings.minimum_purchase}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    minimum_purchase: Number(event.target.value),
                  })
                }
              />
            </div>

            <label className="loyalty-checkbox">
              <input
                type="checkbox"
                checked={settings.points_expire}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    points_expire: event.target.checked,
                  })
                }
              />
              Los puntos vencen
            </label>

            {settings.points_expire && (
              <div className="field">
                <label>Meses hasta el vencimiento</label>
                <input
                  type="number"
                  min="1"
                  value={settings.expiration_months ?? 12}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      expiration_months: Number(event.target.value),
                    })
                  }
                />
              </div>
            )}
          </div>

          <button className="btn" style={{ marginTop: 14 }}>
            Guardar configuración
          </button>
        </form>
      </section>

      <div className="toolbar">
        <div>
          <h2>Catálogo de premios</h2>
          <p className="page-subtitle">
            Productos gratis, descuentos fijos o porcentuales.
          </p>
        </div>

        <button
          className="btn"
          onClick={() => setEditReward(emptyReward)}
        >
          Nuevo premio
        </button>
      </div>

      {editReward && (
        <section className="panel">
          <form onSubmit={saveReward}>
            <div className="form-grid">
              <div className="field">
                <label>Nombre</label>
                <input
                  value={editReward.name}
                  onChange={(event) =>
                    setEditReward({
                      ...editReward,
                      name: event.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="field">
                <label>Tipo</label>
                <select
                  value={editReward.reward_type}
                  onChange={(event) =>
                    setEditReward({
                      ...editReward,
                      reward_type: event.target.value,
                    })
                  }
                >
                  <option value="free_product">Producto gratis</option>
                  <option value="fixed_discount">Descuento fijo</option>
                  <option value="percentage_discount">
                    Descuento porcentual
                  </option>
                  <option value="custom">Beneficio personalizado</option>
                </select>
              </div>

              <div className="field">
                <label>Costo en puntos</label>
                <input
                  type="number"
                  min="1"
                  value={editReward.points_cost}
                  onChange={(event) =>
                    setEditReward({
                      ...editReward,
                      points_cost: Number(event.target.value),
                    })
                  }
                  required
                />
              </div>

              {editReward.reward_type === "free_product" && (
                <div className="field">
                  <label>Producto</label>
                  <select
                    value={editReward.product_id ?? ""}
                    onChange={(event) =>
                      setEditReward({
                        ...editReward,
                        product_id: event.target.value || null,
                      })
                    }
                    required
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {["fixed_discount", "percentage_discount"].includes(
                editReward.reward_type
              ) && (
                <div className="field">
                  <label>
                    {editReward.reward_type === "fixed_discount"
                      ? "Importe del descuento"
                      : "Porcentaje de descuento"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editReward.discount_value}
                    onChange={(event) =>
                      setEditReward({
                        ...editReward,
                        discount_value: Number(event.target.value),
                      })
                    }
                    required
                  />
                </div>
              )}

              <div className="field">
                <label>Descripción</label>
                <input
                  value={editReward.description ?? ""}
                  onChange={(event) =>
                    setEditReward({
                      ...editReward,
                      description: event.target.value,
                    })
                  }
                />
              </div>

              <label className="loyalty-checkbox">
                <input
                  type="checkbox"
                  checked={editReward.active}
                  onChange={(event) =>
                    setEditReward({
                      ...editReward,
                      active: event.target.checked,
                    })
                  }
                />
                Premio activo
              </label>
            </div>

            <div className="actions" style={{ marginTop: 14 }}>
              <button className="btn">Guardar</button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setEditReward(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Premio</th>
                <th>Tipo</th>
                <th>Puntos</th>
                <th>Valor</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {rewards.map((reward) => (
                <tr key={reward.id}>
                  <td>
                    <strong>{reward.name}</strong>
                    <small className="loyalty-subtitle">
                      {reward.description || "Sin descripción"}
                    </small>
                  </td>
                  <td>{reward.reward_type}</td>
                  <td>{reward.points_cost}</td>
                  <td>
                    {reward.reward_type === "percentage_discount"
                      ? `${reward.discount_value}%`
                      : reward.reward_type === "fixed_discount"
                        ? `$${Number(reward.discount_value).toLocaleString(
                            "es-AR"
                          )}`
                        : "—"}
                  </td>
                  <td>{reward.active ? "Activo" : "Inactivo"}</td>
                  <td>
                    <button
                      className="btn secondary"
                      onClick={() => setEditReward(reward)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
