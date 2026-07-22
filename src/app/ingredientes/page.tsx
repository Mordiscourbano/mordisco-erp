import { IngredientsManager } from '@/components/ingredients-manager';
import { createClient } from '@/lib/supabase/server';
export default async function Page(){const s=await createClient();const{data:profile}=await s.from('profiles').select('business_id').single();const{data,error}=await s.from('ingredients').select('*').order('name');if(error)return <div className="error">{error.message}</div>;if(!profile)return <div className="error">Perfil no vinculado.</div>;return <IngredientsManager initial={data||[]} businessId={profile.business_id}/>}
