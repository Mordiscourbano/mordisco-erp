'use client';

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoyaltyAdjuster({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const [points, setPoints] = useState(0);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();

    const { error } = await createClient().rpc("adjust_customer_points", {
      p_customer_id: customerId,
      p_points: points,
      p_note: note || null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Puntos actualizados.");
    setPoints(0);
    setNote("");
    window.location.reload();
  }

  return (
    <form className="loyalty-adjuster" onSubmit={save}>
      <strong>{customerName}</strong>
      <input
        type="number"
        value={points}
        onChange={(e) => setPoints(Number(e.target.value))}
        placeholder="+ o - puntos"
        required
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Motivo"
      />
      <button className="btn secondary">Aplicar</button>
      {message && <small>{message}</small>}
    </form>
  );
}
