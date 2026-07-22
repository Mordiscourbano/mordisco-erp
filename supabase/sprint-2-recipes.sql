begin;

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  yield_quantity numeric(14,4) not null default 1 check (yield_quantity > 0),
  notes text,
  unique(product_id)
);

create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id),
  quantity numeric(14,4) not null check (quantity > 0),
  unique(recipe_id,ingredient_id)
);

alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;

drop policy if exists "business members read recipes" on public.recipes;
create policy "business members read recipes" on public.recipes for select
using (business_id=public.current_business_id());

drop policy if exists "business managers manage recipes" on public.recipes;
create policy "business managers manage recipes" on public.recipes for all
using (business_id=public.current_business_id() and exists(select 1 from public.profiles where id=auth.uid() and role in('owner','manager')))
with check (business_id=public.current_business_id() and exists(select 1 from public.profiles where id=auth.uid() and role in('owner','manager')));

drop policy if exists "business members read recipe items" on public.recipe_items;
create policy "business members read recipe items" on public.recipe_items for select
using (exists(select 1 from public.recipes r where r.id=recipe_id and r.business_id=public.current_business_id()));

drop policy if exists "business managers manage recipe items" on public.recipe_items;
create policy "business managers manage recipe items" on public.recipe_items for all
using (exists(select 1 from public.recipes r join public.profiles p on p.id=auth.uid() where r.id=recipe_id and r.business_id=p.business_id and p.role in('owner','manager')))
with check (exists(select 1 from public.recipes r join public.profiles p on p.id=auth.uid() where r.id=recipe_id and r.business_id=p.business_id and p.role in('owner','manager')));

insert into public.recipes(business_id,product_id,yield_quantity)
select p.business_id,p.id,1 from public.products p
where p.business_id='3d76a7ed-5220-4a16-abe2-c97e6afa87e1'::uuid
on conflict(product_id) do nothing;

-- Ingredientes adicionales pendientes de precio.
insert into public.ingredients(business_id,name,purchase_unit,purchase_price,base_unit,units_per_purchase,notes)
values
('3d76a7ed-5220-4a16-abe2-c97e6afa87e1','Salame','kg',0,'g',1000,'Completar precio'),
('3d76a7ed-5220-4a16-abe2-c97e6afa87e1','Lomito fiambre','kg',0,'g',1000,'Completar precio'),
('3d76a7ed-5220-4a16-abe2-c97e6afa87e1','Arroz','kg',0,'g',1000,'Completar precio'),
('3d76a7ed-5220-4a16-abe2-c97e6afa87e1','Atún','kg',0,'g',1000,'Completar precio'),
('3d76a7ed-5220-4a16-abe2-c97e6afa87e1','Choclo','kg',0,'g',1000,'Completar precio'),
('3d76a7ed-5220-4a16-abe2-c97e6afa87e1','Pollo cocido','kg',0,'g',1000,'Completar precio'),
('3d76a7ed-5220-4a16-abe2-c97e6afa87e1','Parmesano','kg',0,'g',1000,'Completar precio'),
('3d76a7ed-5220-4a16-abe2-c97e6afa87e1','Croutons','kg',0,'g',1000,'Completar precio')
on conflict(business_id,name) do nothing;

-- Función auxiliar para insertar o actualizar componentes por nombre.
create or replace function public.seed_recipe_item(product_name text, ingredient_name text, qty numeric)
returns void language plpgsql security definer set search_path=public as $$
declare rid uuid; iid uuid;
begin
  select r.id into rid from recipes r join products p on p.id=r.product_id where p.business_id='3d76a7ed-5220-4a16-abe2-c97e6afa87e1'::uuid and lower(p.name)=lower(product_name) limit 1;
  select i.id into iid from ingredients i where i.business_id='3d76a7ed-5220-4a16-abe2-c97e6afa87e1'::uuid and lower(i.name)=lower(ingredient_name) limit 1;
  if rid is not null and iid is not null then
    insert into recipe_items(recipe_id,ingredient_id,quantity) values(rid,iid,qty)
    on conflict(recipe_id,ingredient_id) do update set quantity=excluded.quantity;
  end if;
end $$;

-- Milanesas
select seed_recipe_item('Argenta','Pan de queso',1); select seed_recipe_item('Argenta','Milanesa de ternera',1); select seed_recipe_item('Argenta','Jamón',60); select seed_recipe_item('Argenta','Queso Tybo',40); select seed_recipe_item('Argenta','Lechuga',20); select seed_recipe_item('Argenta','Tomate',40); select seed_recipe_item('Argenta','Huevos',1); select seed_recipe_item('Argenta','Papas fritas',1); select seed_recipe_item('Argenta','Caja milanesa',1); select seed_recipe_item('Argenta','Papel parafinado',5);
select seed_recipe_item('Americano','Pan de queso',1); select seed_recipe_item('Americano','Milanesa de ternera',1); select seed_recipe_item('Americano','Cheddar',4); select seed_recipe_item('Americano','Bacon',60); select seed_recipe_item('Americano','Salsa BBQ',20); select seed_recipe_item('Americano','Huevos',2); select seed_recipe_item('Americano','Papas fritas',1); select seed_recipe_item('Americano','Caja milanesa',1); select seed_recipe_item('Americano','Papel parafinado',5);
select seed_recipe_item('Tana','Pan de queso',1); select seed_recipe_item('Tana','Milanesa de ternera',1); select seed_recipe_item('Tana','Muzzarella',50); select seed_recipe_item('Tana','Morrón',30); select seed_recipe_item('Tana','Huevos',2); select seed_recipe_item('Tana','Papas fritas',1); select seed_recipe_item('Tana','Caja milanesa',1); select seed_recipe_item('Tana','Papel parafinado',5);
select seed_recipe_item('Porteña','Pan de queso',1); select seed_recipe_item('Porteña','Milanesa de ternera',2); select seed_recipe_item('Porteña','Cheddar',5); select seed_recipe_item('Porteña','Bacon',75); select seed_recipe_item('Porteña','Lechuga',20); select seed_recipe_item('Porteña','Tomate',40); select seed_recipe_item('Porteña','Huevos',2); select seed_recipe_item('Porteña','Jamón',80); select seed_recipe_item('Porteña','Papas fritas grandes',1); select seed_recipe_item('Porteña','Caja milanesa',1); select seed_recipe_item('Porteña','Papel parafinado',5);

-- Hamburguesas
select seed_recipe_item('Clásica','Medallón 120 g',1); select seed_recipe_item('Clásica','Cheddar',3); select seed_recipe_item('Clásica','Lechuga',20); select seed_recipe_item('Clásica','Tomate',40); select seed_recipe_item('Clásica','Huevos',1); select seed_recipe_item('Clásica','Papas fritas',1); select seed_recipe_item('Clásica','Pan Golden',1); select seed_recipe_item('Clásica','Caja hamburguesa',1); select seed_recipe_item('Clásica','Papel parafinado',5);
select seed_recipe_item('Clásica doble','Medallón 120 g',2); select seed_recipe_item('Clásica doble','Cheddar',6); select seed_recipe_item('Clásica doble','Lechuga',20); select seed_recipe_item('Clásica doble','Tomate',40); select seed_recipe_item('Clásica doble','Huevos',1); select seed_recipe_item('Clásica doble','Papas fritas',1); select seed_recipe_item('Clásica doble','Pan Golden',1); select seed_recipe_item('Clásica doble','Caja hamburguesa',1); select seed_recipe_item('Clásica doble','Papel parafinado',5);
select seed_recipe_item('Bacon','Medallón 120 g',1); select seed_recipe_item('Bacon','Cheddar',3); select seed_recipe_item('Bacon','Bacon',45); select seed_recipe_item('Bacon','Huevos',1); select seed_recipe_item('Bacon','Papas fritas',1); select seed_recipe_item('Bacon','Pan Golden',1); select seed_recipe_item('Bacon','Caja hamburguesa',1); select seed_recipe_item('Bacon','Papel parafinado',5);
select seed_recipe_item('Bacon doble','Medallón 120 g',2); select seed_recipe_item('Bacon doble','Cheddar',6); select seed_recipe_item('Bacon doble','Bacon',90); select seed_recipe_item('Bacon doble','Huevos',1); select seed_recipe_item('Bacon doble','Papas fritas',1); select seed_recipe_item('Bacon doble','Pan Golden',1); select seed_recipe_item('Bacon doble','Caja hamburguesa',1); select seed_recipe_item('Bacon doble','Papel parafinado',5);
select seed_recipe_item('Extra Full','Medallón 120 g',1); select seed_recipe_item('Extra Full','Cheddar',3); select seed_recipe_item('Extra Full','Bacon',45); select seed_recipe_item('Extra Full','Lechuga',20); select seed_recipe_item('Extra Full','Tomate',40); select seed_recipe_item('Extra Full','Huevos',1); select seed_recipe_item('Extra Full','Papas fritas',1); select seed_recipe_item('Extra Full','Pan Golden',1); select seed_recipe_item('Extra Full','Caja hamburguesa',1); select seed_recipe_item('Extra Full','Papel parafinado',5);
select seed_recipe_item('Full','Medallón 120 g',1); select seed_recipe_item('Full','Cheddar',6); select seed_recipe_item('Full','Bacon',90); select seed_recipe_item('Full','Papas fritas',1); select seed_recipe_item('Full','Pan Golden',1); select seed_recipe_item('Full','Caja hamburguesa',1); select seed_recipe_item('Full','Papel parafinado',5);
select seed_recipe_item('Cheeseburger','Medallón 120 g',1); select seed_recipe_item('Cheeseburger','Cheddar',4); select seed_recipe_item('Cheeseburger','Papas fritas',1); select seed_recipe_item('Cheeseburger','Pan Golden',1); select seed_recipe_item('Cheeseburger','Caja hamburguesa',1); select seed_recipe_item('Cheeseburger','Papel parafinado',5);

-- Tostados principales
select seed_recipe_item('Tostado JyQ','Jamón',60); select seed_recipe_item('Tostado JyQ','Queso Tybo',40); select seed_recipe_item('Tostado JyQ','Pan árabe',1); select seed_recipe_item('Tostado JyQ','Papel parafinado',5);
select seed_recipe_item('Tostado Completo','Jamón',60); select seed_recipe_item('Tostado Completo','Queso Tybo',40); select seed_recipe_item('Tostado Completo','Tomate',80); select seed_recipe_item('Tostado Completo','Lechuga',20); select seed_recipe_item('Tostado Completo','Huevos',1); select seed_recipe_item('Tostado Completo','Pan árabe',1); select seed_recipe_item('Tostado Completo','Papel parafinado',5);
select seed_recipe_item('Tostado Crudo y Queso','Crudo',75); select seed_recipe_item('Tostado Crudo y Queso','Queso Tybo',40); select seed_recipe_item('Tostado Crudo y Queso','Pan árabe',1); select seed_recipe_item('Tostado Crudo y Queso','Papel parafinado',5);
select seed_recipe_item('Tostado Jamón y Cheddar','Jamón',80); select seed_recipe_item('Tostado Jamón y Cheddar','Cheddar',5); select seed_recipe_item('Tostado Jamón y Cheddar','Pan árabe',1); select seed_recipe_item('Tostado Jamón y Cheddar','Papel parafinado',5);

-- Ensaladas con información disponible
select seed_recipe_item('Ensalada Completa','Lechuga',50); select seed_recipe_item('Ensalada Completa','Tomate',50); select seed_recipe_item('Ensalada Completa','Zanahoria',50); select seed_recipe_item('Ensalada Completa','Huevos',1); select seed_recipe_item('Ensalada Completa','Jamón',60); select seed_recipe_item('Ensalada Completa','Queso Tybo',30); select seed_recipe_item('Ensalada Completa','Choclo',30);
select seed_recipe_item('Ensalada de Atún','Arroz',250); select seed_recipe_item('Ensalada de Atún','Atún',85); select seed_recipe_item('Ensalada de Atún','Choclo',30); select seed_recipe_item('Ensalada de Atún','Huevos',1); select seed_recipe_item('Ensalada de Atún','Tomate cherry',150); select seed_recipe_item('Ensalada de Atún','Zanahoria',150);
select seed_recipe_item('Ensalada Caesar','Lechuga',90); select seed_recipe_item('Ensalada Caesar','Pollo cocido',120); select seed_recipe_item('Ensalada Caesar','Parmesano',40); select seed_recipe_item('Ensalada Caesar','Croutons',40); select seed_recipe_item('Ensalada Caesar','Huevos',1);

commit;
