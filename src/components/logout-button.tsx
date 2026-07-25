'use client';
import { createClient } from '@/lib/supabase/client';
export function LogoutButton(){
  return <button
  type="button"
  onClick={handleLogout}
  className="logout-button"
>
  Cerrar sesión
</button>;
}
