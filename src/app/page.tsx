import { createClient } from '@/lib/supabase/server';
const money=(v:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(v||0);
export default async function Page(){
  const s=await createClient();
  const [{count:i},{count:p},{data:c},{data:v}]=await Promise.all([
    s.from('ingredients').select('*',{count:'exact',head:true}),
    s.from('products').select('*',{count:'exact',head:true}),
    s.from('fixed_costs').select('monthly_amount'),
    s.from('sales_days').select('revenue,orders')
  ]);
  const fixed=(c||[]).reduce((a,x)=>a+Number(x.monthly_amount||0),0); const rev=(v||[]).reduce((a,x)=>a+Number(x.revenue||0),0); const ord=(v||[]).reduce((a,x)=>a+Number(x.orders||0),0);
  return <><h1>Resumen</h1><section className="grid kpis"><article className="card"><span>Ingredientes</span><strong>{i||0}</strong></article><article className="card"><span>Productos</span><strong>{p||0}</strong></article><article className="card"><span>Facturación</span><strong>{money(rev)}</strong></article><article className="card"><span>Comandas</span><strong>{ord}</strong></article><article className="card"><span>Ticket</span><strong>{money(ord?rev/ord:0)}</strong></article><article className="card"><span>Costos fijos</span><strong>{money(fixed)}</strong></article></section></>;
}
