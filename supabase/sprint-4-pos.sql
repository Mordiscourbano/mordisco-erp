begin;
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 order_number bigint generated always as identity, status text not null default 'completed', channel text not null default 'mostrador',
 payment_method text not null default 'efectivo', subtotal numeric(14,2) not null default 0, discount numeric(14,2) not null default 0,
 total numeric(14,2) not null default 0, customer_name text, note text, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now());
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid not null references public.products(id), quantity numeric(14,4) not null check(quantity>0), unit_price numeric(14,2) not null,
 line_total numeric(14,2) generated always as(quantity*unit_price) stored, note text);
create table if not exists public.cash_sessions (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 opened_by uuid references auth.users(id), closed_by uuid references auth.users(id), opening_amount numeric(14,2) not null default 0,
 closing_amount numeric(14,2), expected_cash numeric(14,2), difference numeric(14,2), status text not null default 'open',
 opened_at timestamptz not null default now(), closed_at timestamptz);
alter table public.orders enable row level security; alter table public.order_items enable row level security; alter table public.cash_sessions enable row level security;
drop policy if exists "orders read" on public.orders; create policy "orders read" on public.orders for select using(business_id=public.current_business_id());
drop policy if exists "items read" on public.order_items; create policy "items read" on public.order_items for select using(exists(select 1 from public.orders o where o.id=order_id and o.business_id=public.current_business_id()));
drop policy if exists "cash manage" on public.cash_sessions; create policy "cash manage" on public.cash_sessions for all using(business_id=public.current_business_id()) with check(business_id=public.current_business_id());
create or replace function public.open_cash_session(p_opening_amount numeric default 0) returns uuid language plpgsql security definer set search_path=public as $$
declare b uuid:=public.current_business_id(); x uuid; begin if exists(select 1 from public.cash_sessions where business_id=b and status='open') then raise exception 'Ya existe una caja abierta'; end if;
insert into public.cash_sessions(business_id,opened_by,opening_amount) values(b,auth.uid(),greatest(coalesce(p_opening_amount,0),0)) returning id into x; return x; end $$;
create or replace function public.close_cash_session(p_closing_amount numeric) returns void language plpgsql security definer set search_path=public as $$
declare b uuid:=public.current_business_id(); s public.cash_sessions%rowtype; cash_sales numeric; expected numeric; begin
select * into s from public.cash_sessions where business_id=b and status='open' order by opened_at desc limit 1; if s.id is null then raise exception 'No hay una caja abierta'; end if;
select coalesce(sum(total),0) into cash_sales from public.orders where business_id=b and payment_method='efectivo' and created_at>=s.opened_at;
expected:=s.opening_amount+cash_sales; update public.cash_sessions set closing_amount=p_closing_amount,expected_cash=expected,difference=p_closing_amount-expected,status='closed',closed_by=auth.uid(),closed_at=now() where id=s.id; end $$;
create or replace function public.register_order(p_items jsonb,p_payment_method text default 'efectivo',p_channel text default 'mostrador',p_discount numeric default 0,p_customer_name text default null,p_note text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare b uuid:=public.current_business_id(); oid uuid; it jsonb; pid uuid; q numeric; price numeric; rid uuid; sub numeric:=0; r record; begin
if jsonb_array_length(coalesce(p_items,'[]'::jsonb))=0 then raise exception 'El pedido está vacío'; end if;
for it in select * from jsonb_array_elements(p_items) loop pid:=(it->>'product_id')::uuid; q:=(it->>'quantity')::numeric; select current_price into price from public.products where id=pid and business_id=b and active=true; if not found then raise exception 'Producto inválido'; end if; sub:=sub+price*q; end loop;
insert into public.orders(business_id,channel,payment_method,subtotal,discount,total,customer_name,note,created_by) values(b,p_channel,p_payment_method,sub,greatest(p_discount,0),greatest(sub-greatest(p_discount,0),0),nullif(p_customer_name,''),nullif(p_note,''),auth.uid()) returning id into oid;
for it in select * from jsonb_array_elements(p_items) loop pid:=(it->>'product_id')::uuid; q:=(it->>'quantity')::numeric; select current_price into price from public.products where id=pid and business_id=b; insert into public.order_items(order_id,product_id,quantity,unit_price) values(oid,pid,q,price);
select id into rid from public.recipes where product_id=pid and business_id=b; if rid is null then raise exception 'El producto no tiene receta'; end if;
for r in select ri.ingredient_id,(ri.quantity*q/greatest(rec.yield_quantity,1)) used from public.recipe_items ri join public.recipes rec on rec.id=ri.recipe_id where ri.recipe_id=rid loop
insert into public.inventory_levels(business_id,ingredient_id,current_quantity) values(b,r.ingredient_id,-r.used) on conflict(business_id,ingredient_id) do update set current_quantity=public.inventory_levels.current_quantity-r.used,updated_at=now();
insert into public.stock_movements(business_id,ingredient_id,movement_type,quantity,reference_type,reference_id,note,created_by) values(b,r.ingredient_id,'sale',-r.used,'order',oid,'Descuento automático por POS',auth.uid()); end loop; end loop; return oid; end $$;
grant execute on function public.open_cash_session(numeric) to authenticated; grant execute on function public.close_cash_session(numeric) to authenticated; grant execute on function public.register_order(jsonb,text,text,numeric,text,text) to authenticated;
commit;