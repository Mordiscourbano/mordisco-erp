
begin;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  birthday date,
  notes text,
  active boolean not null default true,
  marketing_opt_in boolean not null default false,
  loyalty_points integer not null default 0,
  created_at timestamptz not null default now(),
  unique (business_id, phone)
);

create table if not exists public.customer_loyalty_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  movement_type text not null check (
    movement_type in ('earn','redeem','adjustment','expiration')
  ),
  points integer not null check (points <> 0),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  promotion_type text not null check (
    promotion_type in ('percentage','fixed','points')
  ),
  value numeric(14,2) not null default 0,
  minimum_order numeric(14,2) not null default 0,
  points_required integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists customer_id uuid references public.customers(id) on delete set null;

alter table public.customers enable row level security;
alter table public.customer_loyalty_movements enable row level security;
alter table public.promotions enable row level security;

drop policy if exists "customers members read" on public.customers;
create policy "customers members read"
on public.customers for select
using (business_id = public.current_business_id());

drop policy if exists "customers managers manage" on public.customers;
create policy "customers managers manage"
on public.customers for all
using (
  business_id = public.current_business_id()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner','manager')
  )
)
with check (
  business_id = public.current_business_id()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner','manager')
  )
);

drop policy if exists "loyalty members read" on public.customer_loyalty_movements;
create policy "loyalty members read"
on public.customer_loyalty_movements for select
using (business_id = public.current_business_id());

drop policy if exists "promotions members read" on public.promotions;
create policy "promotions members read"
on public.promotions for select
using (business_id = public.current_business_id());

drop policy if exists "promotions managers manage" on public.promotions;
create policy "promotions managers manage"
on public.promotions for all
using (
  business_id = public.current_business_id()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner','manager')
  )
)
with check (
  business_id = public.current_business_id()
  and exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('owner','manager')
  )
);

create or replace function public.adjust_customer_points(
  p_customer_id uuid,
  p_points integer,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid;
begin
  v_business := public.current_business_id();

  update public.customers
  set loyalty_points = greatest(loyalty_points + p_points, 0)
  where id = p_customer_id
    and business_id = v_business;

  if not found then
    raise exception 'Cliente no encontrado';
  end if;

  insert into public.customer_loyalty_movements (
    business_id, customer_id, movement_type, points, note, created_by
  )
  values (
    v_business,
    p_customer_id,
    'adjustment',
    p_points,
    nullif(p_note,''),
    auth.uid()
  );
end;
$$;

create or replace function public.customer_summary()
returns table (
  customer_id uuid,
  full_name text,
  phone text,
  email text,
  birthday date,
  loyalty_points integer,
  orders_count bigint,
  total_spent numeric,
  average_ticket numeric,
  last_order_at timestamptz,
  customer_segment text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.full_name,
    c.phone,
    c.email,
    c.birthday,
    c.loyalty_points,
    count(o.id) filter (where o.status = 'completed') as orders_count,
    coalesce(sum(o.total) filter (where o.status = 'completed'),0) as total_spent,
    case
      when count(o.id) filter (where o.status = 'completed') > 0
      then coalesce(sum(o.total) filter (where o.status = 'completed'),0)
           / count(o.id) filter (where o.status = 'completed')
      else 0
    end as average_ticket,
    max(o.created_at) filter (where o.status = 'completed') as last_order_at,
    case
      when coalesce(sum(o.total) filter (where o.status = 'completed'),0) >= 300000
        or count(o.id) filter (where o.status = 'completed') >= 20 then 'VIP'
      when coalesce(sum(o.total) filter (where o.status = 'completed'),0) >= 100000
        or count(o.id) filter (where o.status = 'completed') >= 8 then 'Frecuente'
      when count(o.id) filter (where o.status = 'completed') >= 1 then 'Activo'
      else 'Nuevo'
    end as customer_segment
  from public.customers c
  left join public.orders o on o.customer_id = c.id
  where c.business_id = public.current_business_id()
    and c.active = true
  group by c.id, c.full_name, c.phone, c.email, c.birthday, c.loyalty_points
  order by total_spent desc, orders_count desc;
$$;

create or replace function public.link_order_customer(
  p_order_id uuid,
  p_customer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid;
  v_order_total numeric;
  v_points integer;
begin
  v_business := public.current_business_id();

  select total
  into v_order_total
  from public.orders
  where id = p_order_id
    and business_id = v_business
    and status = 'completed';

  if v_order_total is null then
    raise exception 'Pedido no encontrado';
  end if;

  update public.orders
  set customer_id = p_customer_id
  where id = p_order_id
    and business_id = v_business;

  v_points := floor(v_order_total / 1000)::integer;

  update public.customers
  set loyalty_points = loyalty_points + v_points
  where id = p_customer_id
    and business_id = v_business;

  insert into public.customer_loyalty_movements (
    business_id, customer_id, order_id, movement_type, points, note, created_by
  )
  values (
    v_business, p_customer_id, p_order_id, 'earn', v_points,
    'Puntos por compra', auth.uid()
  );
end;
$$;

create or replace function public.crm_insights()
returns table (
  total_customers bigint,
  vip_customers bigint,
  birthday_next_30_days bigint,
  inactive_customers bigint,
  customers_with_points bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with summary as (
    select * from public.customer_summary()
  )
  select
    count(*) as total_customers,
    count(*) filter (where customer_segment = 'VIP') as vip_customers,
    count(*) filter (
      where birthday is not null
      and (
        make_date(
          extract(year from current_date)::int,
          extract(month from birthday)::int,
          extract(day from birthday)::int
        )
        between current_date and current_date + 30
      )
    ) as birthday_next_30_days,
    count(*) filter (
      where last_order_at is not null
      and last_order_at < now() - interval '45 days'
    ) as inactive_customers,
    count(*) filter (where loyalty_points > 0) as customers_with_points
  from summary;
$$;

grant execute on function public.adjust_customer_points(uuid,integer,text) to authenticated;
grant execute on function public.customer_summary() to authenticated;
grant execute on function public.link_order_customer(uuid,uuid) to authenticated;
grant execute on function public.crm_insights() to authenticated;

commit;

notify pgrst, 'reload schema';
