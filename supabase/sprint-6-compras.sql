begin;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  payment_terms text,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id),
  order_number bigint generated always as identity,
  status text not null default 'ordered' check (status in ('draft','ordered','partial','received','cancelled')),
  expected_date date,
  invoice_number text,
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  payment_status text not null default 'pending' check (payment_status in ('pending','partial','paid')),
  amount_paid numeric(14,2) not null default 0,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  received_at timestamptz
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id),
  ordered_quantity numeric(14,4) not null check (ordered_quantity > 0),
  received_quantity numeric(14,4) not null default 0 check (received_quantity >= 0),
  unit_cost numeric(14,4) not null check (unit_cost >= 0),
  line_total numeric(14,2) generated always as (ordered_quantity * unit_cost) stored,
  unique (purchase_order_id, ingredient_id)
);

create table if not exists public.ingredient_price_history (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  old_price numeric(14,4),
  new_price numeric(14,4) not null,
  purchase_unit text,
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now()
);

alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.ingredient_price_history enable row level security;

drop policy if exists "suppliers read" on public.suppliers;
create policy "suppliers read" on public.suppliers for select using (business_id = public.current_business_id());
drop policy if exists "suppliers manage" on public.suppliers;
create policy "suppliers manage" on public.suppliers for all using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());

drop policy if exists "purchase orders read" on public.purchase_orders;
create policy "purchase orders read" on public.purchase_orders for select using (business_id = public.current_business_id());
drop policy if exists "purchase orders manage" on public.purchase_orders;
create policy "purchase orders manage" on public.purchase_orders for all using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());

drop policy if exists "purchase items read" on public.purchase_order_items;
create policy "purchase items read" on public.purchase_order_items for select using (
  exists (select 1 from public.purchase_orders po where po.id = purchase_order_id and po.business_id = public.current_business_id())
);

drop policy if exists "price history read" on public.ingredient_price_history;
create policy "price history read" on public.ingredient_price_history for select using (business_id = public.current_business_id());

create or replace function public.create_purchase_order(
  p_supplier_id uuid,
  p_expected_date date,
  p_notes text,
  p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_business uuid; v_order uuid; v_item jsonb; v_subtotal numeric := 0;
begin
  v_business := public.current_business_id();
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then raise exception 'La orden no tiene productos'; end if;
  insert into public.purchase_orders(business_id,supplier_id,expected_date,notes,created_by)
  values(v_business,p_supplier_id,p_expected_date,nullif(p_notes,''),auth.uid()) returning id into v_order;
  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.purchase_order_items(purchase_order_id,ingredient_id,ordered_quantity,unit_cost)
    values(v_order,(v_item->>'ingredient_id')::uuid,(v_item->>'quantity')::numeric,(v_item->>'unit_cost')::numeric);
    v_subtotal := v_subtotal + ((v_item->>'quantity')::numeric * (v_item->>'unit_cost')::numeric);
  end loop;
  update public.purchase_orders set subtotal=v_subtotal,total=v_subtotal where id=v_order;
  return v_order;
end; $$;

create or replace function public.receive_purchase_order(
  p_purchase_order_id uuid,
  p_items jsonb,
  p_invoice_number text default null,
  p_tax_amount numeric default 0,
  p_update_ingredient_prices boolean default true
) returns void
language plpgsql security definer set search_path = public as $$
declare v_business uuid; v_order public.purchase_orders%rowtype; v_item jsonb; v_ing uuid; v_received numeric; v_cost numeric; v_old numeric; v_all boolean;
begin
  v_business := public.current_business_id();
  select * into v_order from public.purchase_orders where id=p_purchase_order_id and business_id=v_business and status not in ('received','cancelled');
  if v_order.id is null then raise exception 'Orden no encontrada o cerrada'; end if;
  for v_item in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    v_ing := (v_item->>'ingredient_id')::uuid;
    v_received := (v_item->>'received_quantity')::numeric;
    v_cost := (v_item->>'unit_cost')::numeric;
    update public.purchase_order_items set received_quantity=least(ordered_quantity,v_received),unit_cost=v_cost
      where purchase_order_id=p_purchase_order_id and ingredient_id=v_ing;
    insert into public.inventory_levels(business_id,ingredient_id,current_quantity)
      values(v_business,v_ing,v_received)
      on conflict(business_id,ingredient_id) do update set current_quantity=public.inventory_levels.current_quantity+excluded.current_quantity,updated_at=now();
    insert into public.stock_movements(business_id,ingredient_id,movement_type,quantity,reference_type,reference_id,note,created_by)
      values(v_business,v_ing,'purchase',v_received,'purchase_order',p_purchase_order_id,'Recepción de compra',auth.uid());
    if p_update_ingredient_prices then
      select purchase_price into v_old from public.ingredients where id=v_ing and business_id=v_business;
      update public.ingredients set purchase_price=v_cost where id=v_ing and business_id=v_business;
      insert into public.ingredient_price_history(business_id,ingredient_id,supplier_id,purchase_order_id,old_price,new_price,purchase_unit,recorded_by)
      select v_business,i.id,v_order.supplier_id,p_purchase_order_id,v_old,v_cost,i.purchase_unit,auth.uid() from public.ingredients i where i.id=v_ing;
    end if;
  end loop;
  select bool_and(received_quantity >= ordered_quantity) into v_all from public.purchase_order_items where purchase_order_id=p_purchase_order_id;
  update public.purchase_orders set status=case when v_all then 'received' else 'partial' end,invoice_number=nullif(p_invoice_number,''),tax_amount=greatest(coalesce(p_tax_amount,0),0),total=subtotal+greatest(coalesce(p_tax_amount,0),0),received_at=case when v_all then now() else received_at end where id=p_purchase_order_id;
end; $$;

create or replace function public.suggested_purchase_list()
returns table(ingredient_id uuid,ingredient_name text,base_unit text,current_quantity numeric,minimum_quantity numeric,target_quantity numeric,suggested_quantity numeric,last_price numeric,suggested_cost numeric)
language sql stable security definer set search_path=public as $$
  select i.id,i.name,i.base_unit,il.current_quantity,il.minimum_quantity,il.target_quantity,
    greatest(il.target_quantity-il.current_quantity,0),i.purchase_price,
    greatest(il.target_quantity-il.current_quantity,0)*(i.purchase_price/greatest(i.units_per_purchase,1))
  from public.inventory_levels il join public.ingredients i on i.id=il.ingredient_id
  where il.business_id=public.current_business_id() and il.current_quantity<=il.minimum_quantity
  order by i.name;
$$;

grant execute on function public.create_purchase_order(uuid,date,text,jsonb) to authenticated;
grant execute on function public.receive_purchase_order(uuid,jsonb,text,numeric,boolean) to authenticated;
grant execute on function public.suggested_purchase_list() to authenticated;

commit;
notify pgrst, 'reload schema';
