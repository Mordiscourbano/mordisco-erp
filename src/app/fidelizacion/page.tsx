import { LoyaltyAdmin } from "@/components/loyalty-admin";
import { createClient } from "@/lib/supabase/server";

export default async function LoyaltyPage() {
  const supabase = await createClient();

  const [
    { data: profile, error: profileError },
    { data: settingsRows, error: settingsError },
    { data: rewards, error: rewardsError },
    { data: products, error: productsError },
  ] = await Promise.all([
    supabase.from("profiles").select("business_id").single(),
    supabase.from("loyalty_settings").select("*").limit(1),
    supabase
      .from("loyalty_rewards")
      .select("*")
      .order("points_cost"),
    supabase
      .from("products")
      .select("id,name")
      .eq("active", true)
      .order("name"),
  ]);

  if (profileError) {
    return <div className="error">{profileError.message}</div>;
  }

  if (settingsError) {
    return <div className="error">{settingsError.message}</div>;
  }

  if (rewardsError) {
    return <div className="error">{rewardsError.message}</div>;
  }

  if (productsError) {
    return <div className="error">{productsError.message}</div>;
  }

  const settings =
    settingsRows?.[0] ?? {
      id: "",
      business_id: profile.business_id,
      pesos_per_point: 1000,
      minimum_purchase: 0,
      points_expire: false,
      expiration_months: null,
      active: true,
    };

  return (
    <>
      <h1 className="page-title">Fidelización</h1>
      <p className="page-subtitle">
        Configuración de puntos y catálogo de premios.
      </p>

      <LoyaltyAdmin
        initialSettings={settings}
        initialRewards={rewards ?? []}
        products={products ?? []}
        businessId={profile.business_id}
      />
    </>
  );
}
