import { KitchenBoard } from "@/components/kitchen-board";
import { createClient } from "@/lib/supabase/server";

export default async function KitchenPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,order_number,channel,customer_name,note,created_at,kitchen_status,order_items(quantity,products(name))"
    )
    .in("kitchen_status", ["pending", "preparing", "ready"])
    .order("created_at", { ascending: true });

  if (error) return <div className="error">{error.message}</div>;

  return <KitchenBoard initial={(data ?? []) as never[]} />;
}
