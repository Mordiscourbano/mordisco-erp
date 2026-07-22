import { ProductsManager } from '@/components/products-manager';
import { createClient } from '@/lib/supabase/server';
export default async function Page(){const s=await createClient();const{data:profile}=await s.from('profiles').select('business_id').single();const{data,error}=await s.from('products').select('*').order('category').order('name');if(error)return <div className="error">{error.message}</div>;if(!profile)return <div className="error">Perfil no vinculado.</div>;return <ProductsManager initial={data||[]} businessId={profile.business_id}/>}
