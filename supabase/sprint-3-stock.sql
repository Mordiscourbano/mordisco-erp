begin;
create table if not exists public.inventory_levels (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 ingredient_id uuid not null references public.ingredients(id) on delete cascade,
 current_quantity numeric(14,4) not null default 0, minimum_quantity numeric(14,4) not null default 0,
 target_quantity numeric(14,4) not null default 0, updated_at timestamptz not null default now(), unique(business_id,ingredient_id));
create table if not exists public.stock_movements (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 ingredient_id uuid not null references public.ingredients(id) on delete cascade,
 movement_type text not null check(movement_type in ('purchase','sale','adjustment','waste','return')),
 quantity numeric(14,4) not null check(quantity<>0), reference_type text, reference_id uuid, note text,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now());
create table if not exists public.sales (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 product_id uuid not null references public.products(id), quantity numeric(14,4) not null check(quantity>0),
 unit_price numeric(14,2) not null default 0, channel text not null default 'mostrador', note text,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now());
insert into public.inventory_levels(business_id,ingredient_id)
select business_id,id from public.ingredients on conflict(business_id,ingredient_id) do nothing;
alter table public.inventory_levels enable row level security;
alter table public.stock_movements enable row level security;
alter table public.sales enable row level security;
drop policy if exists "inventory members read" on public.inventory_levels;
create policy "inventory members read" on public.inventory_levels for select using(business_id=public.current_business_id());
drop policy if exists "inventory managers manage" on public.inventory_levels;
create policy "inventory managers manage" on public.inventory_levels for all using(business_id=public.current_business_id() and exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','manager'))) with check(business_id=public.current_business_id());
drop policy if exists "movements members read" on public.stock_movements;
create policy "movements members read" on public.stock_movements for select using(business_id=public.current_business_id());
drop policy if exists "movements managers insert" on public.stock_movements;
create policy "movements managers insert" on public.stock_movements for insert with check(business_id=public.current_business_id());
drop policy if exists "sales members read" on public.sales;
create policy "sales members read" on public.sales for select using(business_id=public.current_business_id());
drop policy if exists "sales members insert" on public.sales;
create policy "sales members insert" on public.sales for insert with check(business_id=public.current_business_id());
create or replace function public.adjust_stock(p_ingredient_id uuid,p_quantity numeric,p_type text default 'adjustment',p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare b uuid; begin b:=public.current_business_id(); if b is null then raise exception 'Usuario sin negocio vinculado'; end if;
insert into public.inventory_levels(business_id,ingredient_id,current_quantity) values(b,p_ingredient_id,p_quantity)
on conflict(business_id,ingredient_id) do update set current_quantity=public.inventory_levels.current_quantity+excluded.current_quantity,updated_at=now();
insert into public.stock_movements(business_id,ingredient_id,movement_type,quantity,note,created_by) values(b,p_ingredient_id,p_type,p_quantity,p_note,auth.uid()); end $$;
create or replace function public.update_inventory_thresholds(p_ingredient_id uuid,p_minimum numeric,p_target numeric)
returns void language plpgsql security definer set search_path=public as $$ declare b uuid; begin b:=public.current_business_id();
insert into public.inventory_levels(business_id,ingredient_id,minimum_quantity,target_quantity) values(b,p_ingredient_id,greatest(p_minimum,0),greatest(p_target,0))
on conflict(business_id,ingredient_id) do update set minimum_quantity=excluded.minimum_quantity,target_quantity=excluded.target_quantity,updated_at=now(); end $$;
create or replace function public.register_product_sale(p_product_id uuid,p_quantity numeric,p_channel text default 'mostrador',p_note text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare b uuid; sid uuid; price numeric; rid uuid; r record; begin if p_quantity<=0 then raise exception 'Cantidad inválida'; end if; b:=public.current_business_id();
select current_price into price from public.products where id=p_product_id and business_id=b and active=true; if not found then raise exception 'Producto no encontrado'; end if;
select id into rid from public.recipes where product_id=p_product_id and business_id=b; if rid is null then raise exception 'El producto no tiene receta'; end if;
insert into public.sales(business_id,product_id,quantity,unit_price,channel,note,created_by) values(b,p_product_id,p_quantity,price,coalesce(nullif(p_channel,''),'mostrador'),p_note,auth.uid()) returning id into sid;
for r in select ri.ingredient_id,(ri.quantity*p_quantity/greatest(rec.yield_quantity,1)) used_quantity from public.recipe_items ri join public.recipes rec on rec.id=ri.recipe_id where ri.recipe_id=rid loop
 insert into public.inventory_levels(business_id,ingredient_id,current_quantity) values(b,r.ingredient_id,-r.used_quantity)
 on conflict(business_id,ingredient_id) do update set current_quantity=public.inventory_levels.current_quantity-r.used_quantity,updated_at=now();
 insert into public.stock_movements(business_id,ingredient_id,movement_type,quantity,reference_type,reference_id,note,created_by)
 values(b,r.ingredient_id,'sale',-r.used_quantity,'sale',sid,'Venta automática',auth.uid()); end loop; return sid; end $$;
grant execute on function public.adjust_stock(uuid,numeric,text,text) to authenticated;
grant execute on function public.update_inventory_thresholds(uuid,numeric,numeric) to authenticated;
grant execute on function public.register_product_sale(uuid,numeric,text,text) to authenticated;
commit;