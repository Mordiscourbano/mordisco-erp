'use client';
import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ingredientUnitCost, money } from '@/lib/costs';

type Product={id:string;name:string;category:string;current_price:number|string};
type Ingredient={id:string;name:string;purchase_price:number|string;base_unit:string;units_per_purchase:number|string};
type Recipe={id:string;product_id:string;yield_quantity:number|string;product:Product};
type Item={id:string;recipe_id:string;ingredient_id:string;quantity:number|string;ingredient:Ingredient};

export function RecipesManager({initialRecipes,initialItems,ingredients}:{initialRecipes:Recipe[];initialItems:Item[];ingredients:Ingredient[]}){
  const [items,setItems]=useState(initialItems);
  const [selectedRecipe,setSelectedRecipe]=useState(initialRecipes[0]?.id||'');
  const [ingredientId,setIngredientId]=useState(ingredients[0]?.id||'');
  const [quantity,setQuantity]=useState(1);
  const [message,setMessage]=useState('');
  const recipe=initialRecipes.find(r=>r.id===selectedRecipe);
  const recipeItems=useMemo(()=>items.filter(i=>i.recipe_id===selectedRecipe),[items,selectedRecipe]);
  const total=recipeItems.reduce((sum,i)=>sum+ingredientUnitCost(i.ingredient)*Number(i.quantity),0);

  async function addItem(){
    if(!selectedRecipe||!ingredientId||quantity<=0)return;
    setMessage('');
    const supabase=createClient();
    const {data,error}=await supabase.from('recipe_items').upsert({recipe_id:selectedRecipe,ingredient_id:ingredientId,quantity},{onConflict:'recipe_id,ingredient_id'}).select('id,recipe_id,ingredient_id,quantity,ingredient:ingredients(id,name,purchase_price,base_unit,units_per_purchase)').single();
    if(error){setMessage(error.message);return;}
    const normalized=data as unknown as Item;
    setItems(prev=>[...prev.filter(i=>!(i.recipe_id===selectedRecipe&&i.ingredient_id===ingredientId)),normalized]);
    setMessage('Ingrediente guardado.');
  }

  async function removeItem(id:string){
    if(!confirm('¿Quitar este ingrediente de la receta?'))return;
    const {error}=await createClient().from('recipe_items').delete().eq('id',id);
    if(error){setMessage(error.message);return;}
    setItems(prev=>prev.filter(i=>i.id!==id));
  }

  return <>
    <div className="toolbar"><div><h1>Recetas</h1><p className="muted">El costo se calcula usando el precio y rendimiento actual de cada ingrediente.</p></div></div>
    {message&&<div className={message.includes('guardado')?'success':'error'}>{message}</div>}
    <section className="panel">
      <div className="form-grid">
        <div className="field"><label>Producto</label><select className="select" value={selectedRecipe} onChange={e=>setSelectedRecipe(e.target.value)}>{initialRecipes.map(r=><option key={r.id} value={r.id}>{r.product.name}</option>)}</select></div>
        <div className="field"><label>Ingrediente</label><select className="select" value={ingredientId} onChange={e=>setIngredientId(e.target.value)}>{ingredients.map(i=><option key={i.id} value={i.id}>{i.name} ({i.base_unit})</option>)}</select></div>
        <div className="field"><label>Cantidad en unidad base</label><input className="number" type="number" min="0.001" step="0.001" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></div>
      </div>
      <div className="actions" style={{marginTop:14}}><button className="btn" onClick={addItem}>Agregar o actualizar</button></div>
    </section>
    <section className="panel">
      <div className="recipe-head"><div><h2>{recipe?.product.name||'Sin producto'}</h2><span className="muted">{recipe?.product.category}</span></div><div><span className="muted">Costo de receta</span><div className="recipe-total">{money(total)}</div></div></div>
      <div className="table-wrap"><table><thead><tr><th>Ingrediente</th><th>Cantidad</th><th>Costo unitario</th><th>Costo</th><th></th></tr></thead><tbody>
        {recipeItems.map(i=>{const unit=ingredientUnitCost(i.ingredient);return <tr key={i.id}><td>{i.ingredient.name}</td><td>{Number(i.quantity).toLocaleString('es-AR')} {i.ingredient.base_unit}</td><td>{money(unit)}</td><td>{money(unit*Number(i.quantity))}</td><td><button className="btn danger" onClick={()=>removeItem(i.id)}>Quitar</button></td></tr>})}
        {!recipeItems.length&&<tr><td colSpan={5}>Esta receta todavía no tiene ingredientes.</td></tr>}
      </tbody></table></div>
    </section>
  </>;
}
