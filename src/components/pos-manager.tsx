'use client';

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LoyaltyRedemptionPicker } from "@/components/loyalty-redemption-picker";

type Product = {
  id: string;
  name: string;
  category: string;
  current_price: number;
};

type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  loyalty_points: number;
};

type Reward = {
  id: string;
  name: string;
  description: string | null;
  reward_type: string;
  points_cost: number;
  product_id: string | null;
  discount_value: number;
};

type CartItem = Product & {
  quantity: number;
};

const money = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value || 0);

export function PosManager({
  products,
  customers,
  rewards,
  businessId,
}: {
  products: Product[];
  customers: Customer[];
  rewards: Reward[];
  businessId: string;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");
  const [payment, setPayment] = useState("efectivo");
  const [channel, setChannel] = useState("mostrador");
  const [discount, setDiscount] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [rewardId, setRewardId] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [customerList, setCustomerList] = useState(customers);

  const categories = useMemo(
    () => [
      "Todos",
      ...Array.from(new Set(products.map((product) => product.category))),
    ],
    [products]
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory =
          category === "Todos" || product.category === category;
        const matchesSearch = product.name
          .toLowerCase()
          .includes(search.toLowerCase());

        return matchesCategory && matchesSearch;
      }),
    [products, category, search]
  );

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.toLowerCase().trim();

    return customerList
      .filter((customer) => {
        if (!term) return true;

        return (
          customer.full_name.toLowerCase().includes(term) ||
          (customer.phone ?? "").includes(term)
        );
      })
      .slice(0, 10);
  }, [customerList, customerSearch]);

  const selectedCustomer = customerList.find(
    (customer) => customer.id === customerId
  );

  const selectedReward = rewards.find(
    (reward) => reward.id === rewardId
  );

  const subtotal = cart.reduce(
    (total, item) =>
      total + Number(item.current_price) * item.quantity,
    0
  );

  let estimatedLoyaltyDiscount = 0;

  if (selectedReward) {
    if (selectedReward.reward_type === "fixed_discount") {
      estimatedLoyaltyDiscount = Math.min(
        selectedReward.discount_value,
        Math.max(subtotal - discount, 0)
      );
    }

    if (selectedReward.reward_type === "percentage_discount") {
      estimatedLoyaltyDiscount = Math.min(
        Math.max(subtotal - discount, 0) *
          selectedReward.discount_value /
          100,
        Math.max(subtotal - discount, 0)
      );
    }

    if (
      selectedReward.reward_type === "free_product" &&
      selectedReward.product_id
    ) {
      const rewardProduct = products.find(
        (product) => product.id === selectedReward.product_id
      );

      estimatedLoyaltyDiscount = Math.min(
        Number(rewardProduct?.current_price ?? 0),
        Math.max(subtotal - discount, 0)
      );
    }
  }

  const total = Math.max(
    subtotal - discount - estimatedLoyaltyDiscount,
    0
  );

  function add(product: Product) {
    setCart((current) => {
      const existing = current.find(
        (item) => item.id === product.id
      );

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
  }

  function changeQuantity(id: string, quantity: number) {
    setCart((current) =>
      quantity <= 0
        ? current.filter((item) => item.id !== id)
        : current.map((item) =>
            item.id === id ? { ...item, quantity } : item
          )
    );
  }

  async function createCustomer() {
    if (!newCustomerName.trim()) {
      setMessage("Ingresá el nombre del cliente.");
      return;
    }

    const { data, error } = await createClient()
      .from("customers")
      .insert({
        business_id: businessId,
        full_name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || null,
        marketing_opt_in: false,
      })
      .select("id,full_name,phone,loyalty_points")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setCustomerList((current) => [...current, data]);
    setCustomerId(data.id);
    setCustomerSearch(data.full_name);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setShowNewCustomer(false);
    setMessage("Cliente creado y seleccionado.");
  }

  async function finishOrder() {
    if (!cart.length) {
      setMessage("El carrito está vacío.");
      return;
    }

    if (rewardId && !customerId) {
      setMessage("Seleccioná un cliente para canjear puntos.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { data, error } = await createClient().rpc(
      "register_order",
      {
        p_items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
        p_payment_method: payment,
        p_channel: channel,
        p_discount: discount,
        p_customer_name: selectedCustomer?.full_name ?? null,
        p_note: note || null,
        p_customer_id: customerId || null,
        p_reward_id: rewardId || null,
      }
    );

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const redemptionText = selectedReward
      ? ` Canje aplicado: ${selectedReward.name}.`
      : "";

    setMessage(
      `Venta registrada. Pedido ${String(data).slice(0, 8)}.${redemptionText}`
    );

    setCart([]);
    setDiscount(0);
    setRewardId("");
    setNote("");
    setCustomerId("");
    setCustomerSearch("");
  }

  return (
    <>
      <div className="toolbar">
        <div>
          <h1 className="page-title">Punto de Venta</h1>
          <p className="page-subtitle">
            Pedidos, clientes, puntos y canjes.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={
            message.includes("registrada") ||
            message.includes("creado")
              ? "success"
              : "error"
          }
        >
          {message}
        </div>
      )}

      <div className="pos-layout">
        <section className="panel">
          <input
            className="pos-search"
            placeholder="Buscar producto..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="pos-categories">
            {categories.map((item) => (
              <button
                key={item}
                className={`btn ${
                  category === item ? "" : "secondary"
                }`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <button
                className="product-tile"
                key={product.id}
                onClick={() => add(product)}
              >
                <strong>{product.name}</strong>
                <span>{product.category}</span>
                <b>{money(Number(product.current_price))}</b>
              </button>
            ))}
          </div>
        </section>

        <aside className="panel cart-panel">
          <h2>Pedido</h2>

          <section className="pos-customer-box">
            <div className="toolbar">
              <strong>Cliente</strong>
              <button
                type="button"
                className="btn secondary"
                onClick={() =>
                  setShowNewCustomer(!showNewCustomer)
                }
              >
                Nuevo
              </button>
            </div>

            <input
              className="pos-search"
              placeholder="Buscar por nombre o teléfono..."
              value={customerSearch}
              onChange={(event) => {
                setCustomerSearch(event.target.value);
                setCustomerId("");
                setRewardId("");
              }}
            />

            {!customerId && customerSearch && (
              <div className="customer-results">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      setCustomerId(customer.id);
                      setCustomerSearch(customer.full_name);
                      setRewardId("");
                    }}
                  >
                    <strong>{customer.full_name}</strong>
                    <span>
                      {customer.phone || "Sin teléfono"} ·{" "}
                      {customer.loyalty_points} puntos
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selectedCustomer && (
              <>
                <div className="selected-customer">
                  <strong>{selectedCustomer.full_name}</strong>
                  <span>
                    {selectedCustomer.loyalty_points} puntos
                    disponibles
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerId("");
                      setCustomerSearch("");
                      setRewardId("");
                    }}
                  >
                    Quitar
                  </button>
                </div>

                <LoyaltyRedemptionPicker
                  rewards={rewards}
                  availablePoints={
                    selectedCustomer.loyalty_points
                  }
                  selectedRewardId={rewardId}
                  onSelect={setRewardId}
                />
              </>
            )}

            {showNewCustomer && (
              <div className="new-customer-form">
                <input
                  placeholder="Nombre"
                  value={newCustomerName}
                  onChange={(event) =>
                    setNewCustomerName(event.target.value)
                  }
                />
                <input
                  placeholder="Teléfono"
                  value={newCustomerPhone}
                  onChange={(event) =>
                    setNewCustomerPhone(event.target.value)
                  }
                />
                <button
                  type="button"
                  className="btn"
                  onClick={createCustomer}
                >
                  Crear y seleccionar
                </button>
              </div>
            )}
          </section>

          <div className="cart-list">
            {cart.map((item) => (
              <div className="cart-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {money(Number(item.current_price))} c/u
                  </small>
                </div>

                <div className="qty-controls">
                  <button
                    onClick={() =>
                      changeQuantity(item.id, item.quantity - 1)
                    }
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() =>
                      changeQuantity(item.id, item.quantity + 1)
                    }
                  >
                    +
                  </button>
                </div>

                <strong>
                  {money(
                    Number(item.current_price) * item.quantity
                  )}
                </strong>
              </div>
            ))}
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Canal</label>
              <select
                value={channel}
                onChange={(event) =>
                  setChannel(event.target.value)
                }
              >
                <option value="mostrador">Mostrador</option>
                <option value="rappi">Rappi</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="field">
              <label>Pago</label>
              <select
                value={payment}
                onChange={(event) =>
                  setPayment(event.target.value)
                }
              >
                <option value="efectivo">Efectivo</option>
                <option value="mercado_pago">
                  Mercado Pago
                </option>
                <option value="debito">Débito</option>
                <option value="credito">Crédito</option>
                <option value="rappi">Rappi</option>
              </select>
            </div>

            <div className="field">
              <label>Descuento manual</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(event) =>
                  setDiscount(Number(event.target.value))
                }
              />
            </div>

            <div className="field">
              <label>Nota</label>
              <input
                value={note}
                onChange={(event) =>
                  setNote(event.target.value)
                }
              />
            </div>
          </div>

          <div className="totals">
            <div>
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <div>
              <span>Descuento manual</span>
              <strong>{money(discount)}</strong>
            </div>
            <div>
              <span>Canje</span>
              <strong>{money(estimatedLoyaltyDiscount)}</strong>
            </div>
            <div className="grand-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
          </div>

          <button
            className="btn checkout"
            onClick={finishOrder}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Cobrar pedido"}
          </button>
        </aside>
      </div>
    </>
  );
}
