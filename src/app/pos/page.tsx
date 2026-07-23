import { PosManager } from "@/components/pos-manager";
import { createClient } from "@/lib/supabase/server";

export default async function PosPage() {
  const supabase = await createClient();

  const [
    { data: products, error: productError },
    { data: customers, error: customerError },
    { data: rewards, error: rewardError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,category,current_price")
      .eq("active", true)
      .order("category")
      .order("name"),
    supabase
      .from("customers")
      .select("id,full_name,phone,loyalty_points")
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("loyalty_rewards")
      .select(
        "id,name,description,reward_type,points_cost,product_id,discount_value"
      )
      .eq("active", true)
      .order("points_cost"),
    supabase.from("profiles").select("business_id").single(),
  ]);

  if (productError) {
    return <div className="error">{productError.message}</div>;
  }

  if (customerError) {
    return <div className="error">{customerError.message}</div>;
  }

  if (rewardError) {
    return <div className="error">{rewardError.message}</div>;
  }

  if (profileError) {
    return <div className="error">{profileError.message}</div>;
  }

  return (
    <PosManager
      products={products ?? []}
      customers={customers ?? []}
      rewards={rewards ?? []}
      businessId={profile.business_id}
    />
  );
}
