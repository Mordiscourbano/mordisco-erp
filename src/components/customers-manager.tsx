'use client';

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  business_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  notes: string | null;
  marketing_opt_in: boolean;
  loyalty_points: number;
};

export function CustomersManager({
  initial,
  businessId,
}: {
  initial: Customer[];
  businessId: string;
}) {
  const [items, setItems] = useState(initial);
  const [edit, setEdit] = useState<Customer | null>(null);
  const [message, setMessage] = useState("");

  const empty: Customer = {
    id: "",
    business_id: businessId,
    full_name: "",
    phone: "",
    email: "",
    birthday: null,
    notes: "",
    marketing_opt_in: false,
    loyalty_points: 0,
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;

    const payload = {
      business_id: businessId,
      full_name: edit.full_name,
      phone: edit.phone || null,
      email: edit.email || null,
      birthday: edit.birthday || null,
      notes: edit.notes || null,
      marketing_opt_in: edit.marketing_opt_in,
    };

    const supabase = createClient();

    if (edit.id) {
      const { data, error } = await supabase
        .from("customers")
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
        .from("customers")
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
    setMessage("Cliente guardado correctamente.");
  }

  return (
    <>
      <div className="toolbar">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Base de clientes y consentimiento comercial.</p>
        </div>
        <button className="btn" onClick={() => setEdit(empty)}>
          Agregar cliente
        </button>
      </div>

      {message && <div className={message.includes("correctamente") ? "success" : "error"}>{message}</div>}

      {edit && (
        <section className="panel">
          <form onSubmit={save}>
            <div className="form-grid">
              <div className="field">
                <label>Nombre completo</label>
                <input
                  value={edit.full_name}
                  onChange={(e) => setEdit({ ...edit, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>WhatsApp / teléfono</label>
                <input
                  value={edit.phone ?? ""}
                  onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={edit.email ?? ""}
                  onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Cumpleaños</label>
                <input
                  type="date"
                  value={edit.birthday ?? ""}
                  onChange={(e) => setEdit({ ...edit, birthday: e.target.value || null })}
                />
              </div>
              <div className="field">
                <label>Notas</label>
                <input
                  value={edit.notes ?? ""}
                  onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
                />
              </div>
              <label className="crm-checkbox">
                <input
                  type="checkbox"
                  checked={edit.marketing_opt_in}
                  onChange={(e) =>
                    setEdit({ ...edit, marketing_opt_in: e.target.checked })
                  }
                />
                Acepta promociones
              </label>
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
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Cumpleaños</th>
                <th>Puntos</th>
                <th>Promociones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.full_name}</td>
                  <td>{customer.phone || "—"}</td>
                  <td>{customer.email || "—"}</td>
                  <td>
                    {customer.birthday
                      ? new Date(`${customer.birthday}T12:00:00`).toLocaleDateString("es-AR")
                      : "—"}
                  </td>
                  <td>{customer.loyalty_points}</td>
                  <td>{customer.marketing_opt_in ? "Sí" : "No"}</td>
                  <td>
                    <button className="btn secondary" onClick={() => setEdit(customer)}>
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
