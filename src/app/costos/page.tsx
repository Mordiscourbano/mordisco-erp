import { createClient } from '@/lib/supabase/server';
import { ingredientUnitCost, money } from '@/lib/costs';

type Ingredient={id:string;name:string;purchase_price:number|string;base_unit:string;units_per_purchase:number|string};
type Item={quantity:number|string;ingredient:Ingredient};
type Product={id:string;name:string;category:string;current_price:number|string};
type Recipe={id:string;product:Product;items:Item[]};

export default async function Page(){
  const s=await createClient();
  const {data,error}=await s.from('recipes').select('id,product:products(id,name,category,current_price),items:recipe_items(quantity,ingredient:ingredients(id,name,purchase_price,base_unit,units_per_purchase))');
  if(error)return <div className="error">{error.message}</div>;
  const recipes=(data||[]) as unknown as Recipe[];
  return <>
    <div><h1>Costos</h1><p className="muted">Costo directo de receta, margen actual y precio sugerido para un margen del 65%.</p></div>
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>Producto</th><th>Categoría</th><th>Costo receta</th><th>Precio actual</th><th>Margen</th><th>Precio sugerido</th></tr></thead><tbody>
      {recipes.map(r=>{const cost=(r.items||[]).reduce((sum,i)=>sum+ingredientUnitCost(i.ingredient)*Number(i.quantity),0);const price=Number(r.product.current_price||0);const margin=price>0?(price-cost)/price*100:0;const suggested=cost/(1-.65);return <tr key={r.id}><td>{r.product.name}</td><td>{r.product.category}</td><td>{money(cost)}</td><td>{money(price)}</td><td><span className={`badge ${margin>=50?'good':margin>=35?'warn':'dangerText'}`}>{margin.toFixed(1)}%</span></td><td>{money(suggested)}</td></tr>})}
      {!recipes.length&&<tr><td colSpan={6}>Ejecutá primero la migración SQL del Sprint 2.</td></tr>}
    </tbody></table></div></section>
  </>;
}
