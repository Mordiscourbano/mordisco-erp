export type Ingredient = {
  id:string;
  name:string;
  purchase_price:number|string;
  base_unit:string;
  units_per_purchase:number|string;
};

export type RecipeItem = {
  id:string;
  recipe_id:string;
  ingredient_id:string;
  quantity:number|string;
  ingredient?:Ingredient;
};

export function ingredientUnitCost(ingredient:Ingredient){
  const units=Number(ingredient.units_per_purchase||0);
  return units>0 ? Number(ingredient.purchase_price||0)/units : 0;
}

export function recipeItemCost(item:RecipeItem){
  return item.ingredient ? ingredientUnitCost(item.ingredient)*Number(item.quantity||0) : 0;
}

export const money=(value:number)=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(value||0);
