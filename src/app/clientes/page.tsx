import { CustomersManager } from "@/components/customers-manager";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage() {
  const supabase = await createClient();

  const [{ data: profile }, { data, error }] = await Promise.all([
    supabase.from("profiles").select("business_id").single(),
    supabase.from("customers").select("*").order("full_name"),
  ]);

  if (error) return <div className="error">{error.message}</div>;

  return (
    <CustomersManager
      initial={data ?? []}
      businessId={profile!.business_id}
    />
  );
}
