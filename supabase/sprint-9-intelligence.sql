
begin;

create or replace function public.intelligence_sales_forecast(
  p_history_days integer default 28,
  p_forecast_days integer default 7
)
returns table (
  forecast_date date,
  expected_orders numeric,
  expected_revenue numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with daily as (
    select
      date(created_at) as sale_date,
      count(*)::numeric as orders_count,
      coalesce(sum(total),0)::numeric as revenue
    from public.orders
    where business_id = public.current_business_id()
      and status = 'completed'
      and created_at >= current_date - greatest(p_history_days,7)
    group by date(created_at)
  ),
  weekday_avg as (
    select
      extract(isodow from sale_date)::integer as weekday,
      avg(orders_count) as avg_orders,
      avg(revenue) as avg_revenue
    from daily
    group by extract(isodow from sale_date)
  ),
  future_dates as (
    select generate_series(
      current_date + 1,
      current_date + greatest(p_forecast_days,1),
      interval '1 day'
    )::date as forecast_date
  )
  select
    f.forecast_date,
    coalesce(w.avg_orders,0),
    coalesce(w.avg_revenue,0)
  from future_dates f
  left join weekday_avg w
    on w.weekday = extract(isodow from f.forecast_date)::integer
  order by f.forecast_date;
$$;

create or replace function public.intelligence_stock_risk(
  p_history_days integer default 28
)
returns table (
  ingredient_id uuid,
  ingredient_name text,
  base_unit text,
  current_quantity numeric,
  average_daily_usage numeric,
  estimated_days_remaining numeric,
  target_quantity numeric,
  recommended_purchase numeric,
  risk_level text
)
language sql
stable
security definer
set search_path = public
as $$
  with usage_data as (
    select
      sm.ingredient_id,
      abs(sum(sm.quantity)) / greatest(p_history_days,1) as avg_daily_usage
    from public.stock_movements sm
    where sm.business_id = public.current_business_id()
      and sm.movement_type = 'sale'
      and sm.created_at >= now() - make_interval(days => greatest(p_history_days,1))
    group by sm.ingredient_id
  )
  select
    i.id,
    i.name,
    i.base_unit,
    il.current_quantity,
    coalesce(u.avg_daily_usage,0),
    case
      when coalesce(u.avg_daily_usage,0) > 0
      then greatest(il.current_quantity,0) / u.avg_daily_usage
      else null
    end as estimated_days_remaining,
    il.target_quantity,
    greatest(il.target_quantity - il.current_quantity,0) as recommended_purchase,
    case
      when il.current_quantity <= 0 then 'critical'
      when coalesce(u.avg_daily_usage,0) > 0
        and il.current_quantity / u.avg_daily_usage <= 2 then 'critical'
      when coalesce(u.avg_daily_usage,0) > 0
        and il.current_quantity / u.avg_daily_usage <= 5 then 'warning'
      when il.current_quantity <= il.minimum_quantity then 'warning'
      else 'ok'
    end as risk_level
  from public.inventory_levels il
  join public.ingredients i on i.id = il.ingredient_id
  left join usage_data u on u.ingredient_id = il.ingredient_id
  where il.business_id = public.current_business_id()
  order by
    case
      when il.current_quantity <= 0 then 1
      when coalesce(u.avg_daily_usage,0) > 0
        and il.current_quantity / u.avg_daily_usage <= 2 then 1
      when coalesce(u.avg_daily_usage,0) > 0
        and il.current_quantity / u.avg_daily_usage <= 5 then 2
      when il.current_quantity <= il.minimum_quantity then 2
      else 3
    end,
    i.name;
$$;

create or replace function public.intelligence_product_actions(
  p_days integer default 30
)
returns table (
  product_id uuid,
  product_name text,
  category text,
  units_sold numeric,
  revenue numeric,
  estimated_profit numeric,
  estimated_margin numeric,
  action_type text,
  recommendation text
)
language sql
stable
security definer
set search_path = public
as $$
  with product_perf as (
    select
      p.id as product_id,
      p.name as product_name,
      p.category,
      coalesce(sum(oi.quantity),0) as units_sold,
      coalesce(sum(oi.line_total),0) as revenue,
      coalesce(sum(oi.quantity * (p.current_price - rc.direct_cost)),0) as estimated_profit,
      case
        when coalesce(sum(oi.line_total),0) > 0
        then coalesce(sum(oi.quantity * (p.current_price - rc.direct_cost)),0)
             / sum(oi.line_total) * 100
        else 0
      end as estimated_margin
    from public.products p
    left join public.order_items oi on oi.product_id = p.id
    left join public.orders o on o.id = oi.order_id
      and o.status = 'completed'
      and o.created_at >= now() - make_interval(days => greatest(p_days,1))
    left join public.v_product_recipe_costs rc on rc.product_id = p.id
    where p.business_id = public.current_business_id()
      and p.active = true
    group by p.id, p.name, p.category
  ),
  stats as (
    select
      percentile_cont(0.5) within group (order by units_sold) as median_units,
      percentile_cont(0.5) within group (order by estimated_margin) as median_margin
    from product_perf
  )
  select
    pp.product_id,
    pp.product_name,
    pp.category,
    pp.units_sold,
    pp.revenue,
    pp.estimated_profit,
    pp.estimated_margin,
    case
      when pp.units_sold >= coalesce(s.median_units,0)
        and pp.estimated_margin < 35 then 'raise_price'
      when pp.units_sold < coalesce(s.median_units,0) / 2
        and pp.estimated_margin >= coalesce(s.median_margin,0) then 'promote'
      when pp.units_sold < coalesce(s.median_units,0) / 2
        and pp.estimated_margin < 30 then 'review'
      when pp.units_sold >= coalesce(s.median_units,0)
        and pp.estimated_margin >= 45 then 'protect'
      else 'monitor'
    end as action_type,
    case
      when pp.units_sold >= coalesce(s.median_units,0)
        and pp.estimated_margin < 35
        then 'Vende bien, pero deja poco margen. Revisá precio, porción o costo.'
      when pp.units_sold < coalesce(s.median_units,0) / 2
        and pp.estimated_margin >= coalesce(s.median_margin,0)
        then 'Tiene buen margen y pocas ventas. Conviene promocionarlo.'
      when pp.units_sold < coalesce(s.median_units,0) / 2
        and pp.estimated_margin < 30
        then 'Vende poco y deja poco margen. Considerá reformularlo o retirarlo.'
      when pp.units_sold >= coalesce(s.median_units,0)
        and pp.estimated_margin >= 45
        then 'Producto fuerte. Evitá descuentos agresivos y asegurá stock.'
      else 'Sin acción urgente. Seguir observando.'
    end as recommendation
  from product_perf pp
  cross join stats s
  order by
    case
      when pp.units_sold >= coalesce(s.median_units,0)
        and pp.estimated_margin < 35 then 1
      when pp.units_sold < coalesce(s.median_units,0) / 2
        and pp.estimated_margin < 30 then 2
      when pp.units_sold < coalesce(s.median_units,0) / 2
        and pp.estimated_margin >= coalesce(s.median_margin,0) then 3
      else 4
    end,
    pp.estimated_profit desc;
$$;

create or replace function public.intelligence_customer_actions()
returns table (
  customer_id uuid,
  full_name text,
  phone text,
  customer_segment text,
  loyalty_points integer,
  total_spent numeric,
  last_order_at timestamptz,
  action_type text,
  recommendation text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cs.customer_id,
    cs.full_name,
    cs.phone,
    cs.customer_segment,
    cs.loyalty_points,
    cs.total_spent,
    cs.last_order_at,
    case
      when cs.last_order_at is null then 'welcome'
      when cs.last_order_at < now() - interval '60 days' then 'winback_urgent'
      when cs.last_order_at < now() - interval '35 days' then 'winback'
      when cs.birthday is not null
        and (
          make_date(
            extract(year from current_date)::int,
            extract(month from cs.birthday)::int,
            extract(day from cs.birthday)::int
          )
          between current_date and current_date + 14
        ) then 'birthday'
      when cs.customer_segment = 'VIP' then 'vip'
      when cs.loyalty_points >= 100 then 'redeem'
      else 'monitor'
    end as action_type,
    case
      when cs.last_order_at is null
        then 'Cliente nuevo sin compras. Enviá una bienvenida con beneficio simple.'
      when cs.last_order_at < now() - interval '60 days'
        then 'Cliente muy inactivo. Usá una promoción de recuperación limitada.'
      when cs.last_order_at < now() - interval '35 days'
        then 'Hace más de 35 días que no compra. Enviá recordatorio o promoción.'
      when cs.birthday is not null
        and (
          make_date(
            extract(year from current_date)::int,
            extract(month from cs.birthday)::int,
            extract(day from cs.birthday)::int
          )
          between current_date and current_date + 14
        )
        then 'Cumpleaños próximo. Prepará un mensaje y beneficio personalizado.'
      when cs.customer_segment = 'VIP'
        then 'Cliente VIP. Priorizá atención y beneficios exclusivos.'
      when cs.loyalty_points >= 100
        then 'Tiene puntos suficientes para un canje. Recordáselo.'
      else 'Sin acción urgente.'
    end as recommendation
  from public.customer_summary() cs
  order by
    case
      when cs.last_order_at < now() - interval '60 days' then 1
      when cs.last_order_at < now() - interval '35 days' then 2
      when cs.customer_segment = 'VIP' then 3
      else 4
    end,
    cs.total_spent desc;
$$;

create or replace function public.intelligence_kitchen_actions(
  p_days integer default 14
)
returns table (
  observation_type text,
  metric_value numeric,
  recommendation text
)
language sql
stable
security definer
set search_path = public
as $$
  with metrics as (
    select *
    from public.kitchen_metrics(greatest(p_days,1))
  ),
  peak as (
    select
      extract(hour from preparation_started_at)::integer as peak_hour,
      count(*) as order_count
    from public.orders
    where business_id = public.current_business_id()
      and preparation_started_at is not null
      and created_at >= now() - make_interval(days => greatest(p_days,1))
    group by extract(hour from preparation_started_at)
    order by count(*) desc
    limit 1
  )
  select
    'average_preparation'::text,
    m.average_preparation_minutes,
    case
      when m.average_preparation_minutes > 15
        then 'La preparación promedio supera 15 minutos. Revisá dotación, mise en place y productos lentos.'
      when m.average_preparation_minutes > 10
        then 'La preparación está en zona de atención. Revisá los pedidos demorados.'
      else 'Tiempo de preparación saludable.'
    end
  from metrics m

  union all

  select
    'delayed_orders',
    m.delayed_orders::numeric,
    case
      when m.delayed_orders > 5
        then 'Hay varias demoras. Identificá productos y horarios que generan cuello de botella.'
      else 'Las demoras están controladas.'
    end
  from metrics m

  union all

  select
    'peak_hour',
    coalesce(p.peak_hour,0)::numeric,
    case
      when p.peak_hour is null then 'Todavía no hay suficientes datos de cocina.'
      else 'La mayor carga comienza cerca de las ' || p.peak_hour || ':00. Prepará refuerzo antes de ese horario.'
    end
  from peak p;
$$;

grant execute on function public.intelligence_sales_forecast(integer,integer) to authenticated;
grant execute on function public.intelligence_stock_risk(integer) to authenticated;
grant execute on function public.intelligence_product_actions(integer) to authenticated;
grant execute on function public.intelligence_customer_actions() to authenticated;
grant execute on function public.intelligence_kitchen_actions(integer) to authenticated;

commit;

notify pgrst, 'reload schema';
