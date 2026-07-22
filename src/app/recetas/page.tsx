import { createClient } from '@/lib/supabase/server';
import { RecipesManager } from '@/components/recipes-manager';

export default async function Page(){
  const s=await createClient();
  const [{data:recipes,error:recipesError},{data:items,error:itemsError},{data:ingredients,error:ingredientsError}]=await Promise.all([
    s.from('recipes').select('id,product_id,yield_quantity,product:products(id,name,category,current_price)').order('product_id'),
    s.from('recipe_items').select('id,recipe_id,ingredient_id,quantity,ingredient:ingredients(id,name,purchase_price,base_unit,units_per_purchase)'),
    s.from('ingredients').select('id,name,purchase_price,base_unit,units_per_purchase').eq('active',true).order('name')
  ]);
  const error=recipesError||itemsError||ingredientsError;
  if(error)return <div className="error">{error.message}</div>;
  return <RecipesManager initialRecipes={(recipes||[]) as never[]} initialItems={(items||[]) as never[]} ingredients={(ingredients||[]) as never[]}/>;
}
