'use client';

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Promotion = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  promotion_type: string;
  value: number;
  minimum_order: number;
  points_required: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
};

export function PromotionsManager({
  initial,
  businessId,
}: {
  initial: Promotion[];
  businessId: string;
}) {
  const [items, setItems] = useState(initial);
  const [edit, setEdit] = useState<Promotion | null>(null);
  const [message, setMessage] = useState("");

  const empty: Promotion = {
    id: "",
    business_id: businessId,
    name: "",
    description: "",
    promotion_type: "percentage",
    value: 10,
    minimum_order: 0,
    points_required: 0,
    starts_at: null,
    ends_at: null,
    active: true,
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;

    const payload = {
      business_id: businessId,
      name: edit.name,
      description: edit.description || null,
      promotion_type: edit.promotion_type,
      value: edit.value,
      minimum_order: edit.minimum_order,
      points_required: edit.points_required,
      starts_at: edit.starts_at || null,
      ends_at: edit.ends_at || null,
      active: edit.active,
    };

    const supabase = createClient();

    if (edit.id) {
      const { data, error } = await supabase
        .from("promotions")
        .update(payload)
        .eq("id", edit.id)
        .select()
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }
      setItems(items.map((item) => (item.id === edit.id ? data : item)));
    } else {
      const { data, error } = await supabase
        .from("promotions")
        .insert(payload)
        .select()
        .single();

      if (error) {
        setMessage(error.message);
        return;
      }
      setItems([...items, data]);
    }

    setEdit(null);
    setMessage("Promoción guardada.");
  }

  return (
    <>
      <div className="toolbar">
        <div>
          <h1 className="page-title">Promociones</h1>
          <p className="page-subtitle">Campañas, descuentos y canjes con puntos.</p>
        </div>
        <button className="btn" onClick={() => setEdit(empty)}>
          Nueva promoción
        </button>
      </div>

      {message && <div className="success">{message}</div>}

      {edit && (
        <section className="panel">
          <form onSubmit={save}>
            <div className="form-grid">
              <div className="field">
                <label>Nombre</label>
                <input
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Tipo</label>
                <select
                  value={edit.promotion_type}
                  onChange={(e) =>
                    setEdit({ ...edit, promotion_type: e.target.value })
                  }
                >
                  <option value="percentage">Porcentaje</option>
                  <option value="fixed">Importe fijo</option>
                  <option value="points">Canje por puntos</option>
                </select>
              </div>
              <div className="field">
                <label>Valor</label>
                <input
                  type="number"
                  value={edit.value}
                  onChange={(e) => setEdit({ ...edit, value: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label>Compra mínima</label>
                <input
                  type="number"
                  value={edit.minimum_order}
                  onChange={(e) =>
                    setEdit({ ...edit, minimum_order: Number(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label>Puntos requeridos</label>
                <input
                  type="number"
                  value={edit.points_required}
                  onChange={(e) =>
                    setEdit({ ...edit, points_required: Number(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label>Descripción</label>
                <input
                  value={edit.description ?? ""}
                  onChange={(e) =>
                    setEdit({ ...edit, description: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="actions" style={{ marginTop: 14 }}>
              <button className="btn">Guardar</button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setEdit(null)}
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
                <th>Promoción</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Mínimo</th>
                <th>Puntos</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((promotion) => (
                <tr key={promotion.id}>
                  <td>{promotion.name}</td>
                  <td>{promotion.promotion_type}</td>
                  <td>{promotion.value}</td>
                  <td>${Number(promotion.minimum_order).toLocaleString("es-AR")}</td>
                  <td>{promotion.points_required}</td>
                  <td>{promotion.active ? "Activa" : "Inactiva"}</td>
                  <td>
                    <button className="btn secondary" onClick={() => setEdit(promotion)}>
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
