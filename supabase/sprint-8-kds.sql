
begin;

alter table public.orders
  add column if not exists kitchen_status text not null default 'pending'
    check (kitchen_status in ('pending','preparing','ready','delivered','cancelled')),
  add column if not exists kitchen_priority integer not null default 0,
  add column if not exists preparation_started_at timestamptz,
  add column if not exists ready_at timestamptz,
  add column if not exists delivered_at timestamptz;

create table if not exists public.kitchen_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.kitchen_events enable row level security;

drop policy if exists "kitchen events members read" on public.kitchen_events;
create policy "kitchen events members read"
on public.kitchen_events for select
using (business_id = public.current_business_id());

create or replace function public.update_kitchen_status(
  p_order_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid;
  v_old_status text;
begin
  v_business := public.current_business_id();

  if p_status not in ('pending','preparing','ready','delivered','cancelled') then
    raise exception 'Estado inválido';
  end if;

  select kitchen_status
  into v_old_status
  from public.orders
  where id = p_order_id
    and business_id = v_business;

  if v_old_status is null then
    raise exception 'Pedido no encontrado';
  end if;

  update public.orders
  set
    kitchen_status = p_status,
    preparation_started_at = case
      when p_status = 'preparing' and preparation_started_at is null then now()
      else preparation_started_at
    end,
    ready_at = case
      when p_status = 'ready' then now()
      else ready_at
    end,
    delivered_at = case
      when p_status = 'delivered' then now()
      else delivered_at
    end
  where id = p_order_id
    and business_id = v_business;

  insert into public.kitchen_events (
    business_id, order_id, from_status, to_status, changed_by
  )
  values (
    v_business, p_order_id, v_old_status, p_status, auth.uid()
  );
end;
$$;

create or replace function public.kitchen_metrics(
  p_days integer default 7
)
returns table (
  completed_orders bigint,
  average_preparation_minutes numeric,
  average_delivery_minutes numeric,
  delayed_orders bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where kitchen_status in ('ready','delivered')),
    coalesce(avg(extract(epoch from (ready_at - preparation_started_at))/60)
      filter (where preparation_started_at is not null and ready_at is not null),0),
    coalesce(avg(extract(epoch from (delivered_at - ready_at))/60)
      filter (where ready_at is not null and delivered_at is not null),0),
    count(*) filter (
      where preparation_started_at is not null
        and ready_at is not null
        and extract(epoch from (ready_at - preparation_started_at))/60 > 15
    )
  from public.orders
  where business_id = public.current_business_id()
    and created_at >= now() - make_interval(days => greatest(p_days,1))
    and status = 'completed';
$$;

grant execute on function public.update_kitchen_status(uuid,text) to authenticated;
grant execute on function public.kitchen_metrics(integer) to authenticated;

commit;

notify pgrst, 'reload schema';
