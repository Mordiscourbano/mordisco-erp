import { PromotionsManager } from "@/components/promotions-manager";
import { createClient } from "@/lib/supabase/server";

export default async function PromotionsPage() {
  const supabase = await createClient();

  const [{ data: profile }, { data, error }] = await Promise.all([
    supabase.from("profiles").select("business_id").single(),
    supabase.from("promotions").select("*").order("created_at", { ascending: false }),
  ]);

  if (error) return <div className="error">{error.message}</div>;

  return (
    <PromotionsManager
      initial={data ?? []}
      businessId={profile!.business_id}
    />
  );
}
