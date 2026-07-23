
begin;

create table if not exists public.loyalty_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  pesos_per_point numeric(14,2) not null default 1000 check (pesos_per_point > 0),
  minimum_purchase numeric(14,2) not null default 0 check (minimum_purchase >= 0),
  points_expire boolean not null default false,
  expiration_months integer check (expiration_months is null or expiration_months > 0),
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (business_id)
);

create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  reward_type text not null check (
    reward_type in ('free_product','fixed_discount','percentage_discount','custom')
  ),
  points_cost integer not null check (points_cost > 0),
  product_id uuid references public.products(id) on delete set null,
  discount_value numeric(14,2) not null default 0 check (discount_value >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_redemptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  reward_id uuid not null references public.loyalty_rewards(id),
  order_id uuid references public.orders(id) on delete set null,
  points_spent integer not null check (points_spent > 0),
  discount_amount numeric(14,2) not null default 0,
  status text not null default 'completed'
    check (status in ('completed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_multipliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  weekday integer check (weekday between 1 and 7),
  multiplier numeric(8,2) not null default 1 check (multiplier > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists loyalty_redemption_id uuid
    references public.loyalty_redemptions(id) on delete set null,
  add column if not exists loyalty_discount numeric(14,2) not null default 0;

alter table public.loyalty_settings enable row level security;
alter table public.loyalty_rewards enable row level security;
alter table public.loyalty_redemptions enable row level security;
alter table public.loyalty_multipliers enable row level security;

drop policy if exists "loyalty settings members read" on public.loyalty_settings;
create policy "loyalty settings members read"
on public.loyalty_settings for select
using (business_id = public.current_business_id());

drop policy if exists "loyalty settings managers manage" on public.loyalty_settings;
create policy "loyalty settings managers manage"
on public.loyalty_settings for all
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

drop policy if exists "loyalty rewards members read" on public.loyalty_rewards;
create policy "loyalty rewards members read"
on public.loyalty_rewards for select
using (business_id = public.current_business_id());

drop policy if exists "loyalty rewards managers manage" on public.loyalty_rewards;
create policy "loyalty rewards managers manage"
on public.loyalty_rewards for all
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

drop policy if exists "loyalty redemptions members read" on public.loyalty_redemptions;
create policy "loyalty redemptions members read"
on public.loyalty_redemptions for select
using (business_id = public.current_business_id());

drop policy if exists "loyalty multipliers members read" on public.loyalty_multipliers;
create policy "loyalty multipliers members read"
on public.loyalty_multipliers for select
using (business_id = public.current_business_id());

drop policy if exists "loyalty multipliers managers manage" on public.loyalty_multipliers;
create policy "loyalty multipliers managers manage"
on public.loyalty_multipliers for all
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

insert into public.loyalty_settings (
  business_id,
  pesos_per_point,
  minimum_purchase,
  points_expire,
  expiration_months
)
select
  id,
  1000,
  0,
  false,
  null
from public.businesses
on conflict (business_id) do nothing;

create or replace function public.calculate_loyalty_points(
  p_total numeric,
  p_order_date timestamptz default now()
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business uuid;
  v_settings public.loyalty_settings%rowtype;
  v_multiplier numeric := 1;
  v_points integer := 0;
begin
  v_business := public.current_business_id();

  select *
  into v_settings
  from public.loyalty_settings
  where business_id = v_business
    and active = true;

  if v_settings.id is null then
    return floor(greatest(p_total,0) / 1000)::integer;
  end if;

  if p_total < v_settings.minimum_purchase then
    return 0;
  end if;

  select coalesce(max(multiplier), 1)
  into v_multiplier
  from public.loyalty_multipliers
  where business_id = v_business
    and active = true
    and (weekday is null or weekday = extract(isodow from p_order_date)::integer)
    and (starts_at is null or p_order_date >= starts_at)
    and (ends_at is null or p_order_date <= ends_at);

  v_points :=
    floor(greatest(p_total,0) / v_settings.pesos_per_point * v_multiplier)::integer;

  return greatest(v_points,0);
end;
$$;

create or replace function public.preview_loyalty_reward(
  p_customer_id uuid,
  p_reward_id uuid,
  p_subtotal numeric
)
returns table (
  reward_id uuid,
  reward_name text,
  reward_type text,
  points_cost integer,
  available_points integer,
  can_redeem boolean,
  discount_amount numeric,
  product_id uuid,
  product_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.name,
    r.reward_type,
    r.points_cost,
    c.loyalty_points,
    c.loyalty_points >= r.points_cost,
    case
      when r.reward_type = 'fixed_discount'
        then least(r.discount_value, greatest(p_subtotal,0))
      when r.reward_type = 'percentage_discount'
        then least(
          greatest(p_subtotal,0) * r.discount_value / 100,
          greatest(p_subtotal,0)
        )
      else 0
    end,
    r.product_id,
    p.name
  from public.loyalty_rewards r
  join public.customers c
    on c.id = p_customer_id
   and c.business_id = r.business_id
  left join public.products p on p.id = r.product_id
  where r.id = p_reward_id
    and r.business_id = public.current_business_id()
    and r.active = true;
$$;

create or replace function public.redeem_loyalty_reward(
  p_customer_id uuid,
  p_reward_id uuid,
  p_order_id uuid,
  p_discount_amount numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid;
  v_customer_points integer;
  v_reward public.loyalty_rewards%rowtype;
  v_redemption_id uuid;
begin
  v_business := public.current_business_id();

  select *
  into v_reward
  from public.loyalty_rewards
  where id = p_reward_id
    and business_id = v_business
    and active = true;

  if v_reward.id is null then
    raise exception 'Premio no válido';
  end if;

  select loyalty_points
  into v_customer_points
  from public.customers
  where id = p_customer_id
    and business_id = v_business
  for update;

  if v_customer_points is null then
    raise exception 'Cliente no encontrado';
  end if;

  if v_customer_points < v_reward.points_cost then
    raise exception 'Puntos insuficientes';
  end if;

  update public.customers
  set loyalty_points = loyalty_points - v_reward.points_cost
  where id = p_customer_id
    and business_id = v_business;

  insert into public.loyalty_redemptions (
    business_id,
    customer_id,
    reward_id,
    order_id,
    points_spent,
    discount_amount,
    created_by
  )
  values (
    v_business,
    p_customer_id,
    p_reward_id,
    p_order_id,
    v_reward.points_cost,
    greatest(coalesce(p_discount_amount,0),0),
    auth.uid()
  )
  returning id into v_redemption_id;

  insert into public.customer_loyalty_movements (
    business_id,
    customer_id,
    order_id,
    movement_type,
    points,
    note,
    created_by
  )
  values (
    v_business,
    p_customer_id,
    p_order_id,
    'redeem',
    -v_reward.points_cost,
    'Canje: ' || v_reward.name,
    auth.uid()
  );

  update public.orders
  set
    loyalty_redemption_id = v_redemption_id,
    loyalty_discount = greatest(coalesce(p_discount_amount,0),0)
  where id = p_order_id
    and business_id = v_business;

  return v_redemption_id;
end;
$$;

drop function if exists public.register_order(
  jsonb,text,text,numeric,text,text,uuid
);

create function public.register_order(
  p_items jsonb,
  p_payment_method text default 'efectivo',
  p_channel text default 'mostrador',
  p_discount numeric default 0,
  p_customer_name text default null,
  p_note text default null,
  p_customer_id uuid default null,
  p_reward_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business uuid;
  v_order_id uuid;
  v_subtotal numeric := 0;
  v_manual_discount numeric := 0;
  v_loyalty_discount numeric := 0;
  v_total numeric := 0;
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_price numeric;
  v_recipe_id uuid;
  v_points integer := 0;
  v_preview record;
  v_reward public.loyalty_rewards%rowtype;
  r record;
begin
  v_business := public.current_business_id();

  if v_business is null then
    raise exception 'Usuario sin negocio vinculado';
  end if;

  if jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then
    raise exception 'El pedido está vacío';
  end if;

  if p_customer_id is not null and not exists (
    select 1
    from public.customers
    where id = p_customer_id
      and business_id = v_business
      and active = true
  ) then
    raise exception 'Cliente no válido';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;

    if v_quantity <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    select current_price
    into v_price
    from public.products
    where id = v_product_id
      and business_id = v_business
      and active = true;

    if not found then
      raise exception 'Producto no encontrado o inactivo';
    end if;

    v_subtotal := v_subtotal + (v_price * v_quantity);
  end loop;

  v_manual_discount := least(
    greatest(coalesce(p_discount,0),0),
    v_subtotal
  );

  if p_reward_id is not null then
    if p_customer_id is null then
      raise exception 'Debe seleccionar un cliente para canjear puntos';
    end if;

    select *
    into v_preview
    from public.preview_loyalty_reward(
      p_customer_id,
      p_reward_id,
      greatest(v_subtotal - v_manual_discount,0)
    );

    if v_preview.reward_id is null then
      raise exception 'Premio no encontrado';
    end if;

    if not v_preview.can_redeem then
      raise exception 'Puntos insuficientes';
    end if;

    select *
    into v_reward
    from public.loyalty_rewards
    where id = p_reward_id;

    v_loyalty_discount := coalesce(v_preview.discount_amount,0);

    if v_reward.reward_type = 'free_product' then
      if v_reward.product_id is null then
        raise exception 'El premio no tiene producto asociado';
      end if;

      select current_price
      into v_price
      from public.products
      where id = v_reward.product_id
        and business_id = v_business
        and active = true;

      if v_price is null then
        raise exception 'Producto del premio no disponible';
      end if;

      v_loyalty_discount := least(
        v_price,
        greatest(v_subtotal - v_manual_discount,0)
      );
    end if;
  end if;

  v_total := greatest(
    v_subtotal - v_manual_discount - v_loyalty_discount,
    0
  );

  insert into public.orders (
    business_id,
    status,
    channel,
    payment_method,
    subtotal,
    discount,
    loyalty_discount,
    total,
    customer_id,
    customer_name,
    note,
    created_by
  )
  values (
    v_business,
    'completed',
    coalesce(nullif(p_channel,''),'mostrador'),
    coalesce(nullif(p_payment_method,''),'efectivo'),
    v_subtotal,
    v_manual_discount,
    v_loyalty_discount,
    v_total,
    p_customer_id,
    nullif(p_customer_name,''),
    nullif(p_note,''),
    auth.uid()
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;

    select current_price
    into v_price
    from public.products
    where id = v_product_id
      and business_id = v_business;

    insert into public.order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      note
    )
    values (
      v_order_id,
      v_product_id,
      v_quantity,
      v_price,
      nullif(v_item->>'note','')
    );

    select id
    into v_recipe_id
    from public.recipes
    where product_id = v_product_id
      and business_id = v_business;

    if v_recipe_id is null then
      raise exception 'El producto no tiene receta';
    end if;

    for r in
      select
        ri.ingredient_id,
        (
          ri.quantity * v_quantity
          / greatest(rec.yield_quantity,1)
        ) as used_quantity
      from public.recipe_items ri
      join public.recipes rec on rec.id = ri.recipe_id
      where ri.recipe_id = v_recipe_id
    loop
      insert into public.inventory_levels (
        business_id,
        ingredient_id,
        current_quantity
      )
      values (
        v_business,
        r.ingredient_id,
        -r.used_quantity
      )
      on conflict (business_id, ingredient_id)
      do update set
        current_quantity =
          public.inventory_levels.current_quantity - r.used_quantity,
        updated_at = now();

      insert into public.stock_movements (
        business_id,
        ingredient_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        note,
        created_by
      )
      values (
        v_business,
        r.ingredient_id,
        'sale',
        -r.used_quantity,
        'order',
        v_order_id,
        'Descuento automático por POS',
        auth.uid()
      );
    end loop;
  end loop;

  if p_reward_id is not null then
    perform public.redeem_loyalty_reward(
      p_customer_id,
      p_reward_id,
      v_order_id,
      v_loyalty_discount
    );
  end if;

  if p_customer_id is not null then
    v_points := public.calculate_loyalty_points(v_total, now());

    if v_points > 0 then
      update public.customers
      set loyalty_points = loyalty_points + v_points
      where id = p_customer_id
        and business_id = v_business;

      insert into public.customer_loyalty_movements (
        business_id,
        customer_id,
        order_id,
        movement_type,
        points,
        note,
        created_by
      )
      values (
        v_business,
        p_customer_id,
        v_order_id,
        'earn',
        v_points,
        'Puntos generados automáticamente por compra',
        auth.uid()
      );
    end if;
  end if;

  return v_order_id;
end;
$$;

grant execute on function public.calculate_loyalty_points(numeric,timestamptz)
to authenticated;

grant execute on function public.preview_loyalty_reward(uuid,uuid,numeric)
to authenticated;

grant execute on function public.redeem_loyalty_reward(uuid,uuid,uuid,numeric)
to authenticated;

grant execute on function public.register_order(
  jsonb,text,text,numeric,text,text,uuid,uuid
) to authenticated;

commit;

notify pgrst, 'reload schema';
