begin;
create or replace view public.v_product_recipe_costs as
select p.business_id,p.id as product_id,p.name as product_name,p.category,p.current_price,
coalesce(sum((ri.quantity/greatest(r.yield_quantity,1))*(i.purchase_price/greatest(i.units_per_purchase,1))),0) as direct_cost
from public.products p left join public.recipes r on r.product_id=p.id left join public.recipe_items ri on ri.recipe_id=r.id left join public.ingredients i on i.id=ri.ingredient_id
where p.active=true group by p.business_id,p.id,p.name,p.category,p.current_price;
create or replace view public.v_order_profitability as
select o.business_id,o.id as order_id,o.order_number,o.created_at,o.channel,o.payment_method,o.total,
coalesce(sum(oi.quantity*rc.direct_cost),0) as estimated_cost,
o.total-coalesce(sum(oi.quantity*rc.direct_cost),0) as estimated_gross_profit
from public.orders o left join public.order_items oi on oi.order_id=o.id left join public.v_product_recipe_costs rc on rc.product_id=oi.product_id
where o.status='completed' group by o.business_id,o.id,o.order_number,o.created_at,o.channel,o.payment_method,o.total;
create or replace function public.dashboard_summary(p_from timestamptz default date_trunc('month',now()),p_to timestamptz default now())
returns table(revenue numeric,orders_count bigint,units_sold numeric,average_ticket numeric,estimated_cost numeric,estimated_gross_profit numeric,estimated_margin numeric,cash_revenue numeric,mercado_pago_revenue numeric,rappi_revenue numeric)
language sql stable security definer set search_path=public as $$
with f as (select * from public.v_order_profitability where business_id=public.current_business_id() and created_at>=p_from and created_at<p_to),
u as (select coalesce(sum(oi.quantity),0) units_sold from public.order_items oi join public.orders o on o.id=oi.order_id where o.business_id=public.current_business_id() and o.status='completed' and o.created_at>=p_from and o.created_at<p_to)
select coalesce(sum(f.total),0),count(*),u.units_sold,case when count(*)>0 then coalesce(sum(f.total),0)/count(*) else 0 end,
coalesce(sum(f.estimated_cost),0),coalesce(sum(f.estimated_gross_profit),0),case when coalesce(sum(f.total),0)>0 then coalesce(sum(f.estimated_gross_profit),0)/sum(f.total)*100 else 0 end,
coalesce(sum(f.total) filter(where f.payment_method='efectivo'),0),coalesce(sum(f.total) filter(where f.payment_method='mercado_pago'),0),coalesce(sum(f.total) filter(where f.payment_method='rappi'),0)
from f cross join u group by u.units_sold; $$;
create or replace function public.dashboard_daily_sales(p_days integer default 14)
returns table(sale_date date,revenue numeric,orders_count bigint,estimated_gross_profit numeric)
language sql stable security definer set search_path=public as $$
select date(created_at),coalesce(sum(total),0),count(*),coalesce(sum(estimated_gross_profit),0) from public.v_order_profitability
where business_id=public.current_business_id() and created_at>=current_date-greatest(p_days,1) group by date(created_at) order by sale_date; $$;
create or replace function public.dashboard_hourly_sales(p_days integer default 30)
returns table(sale_hour integer,revenue numeric,orders_count bigint)
language sql stable security definer set search_path=public as $$
select extract(hour from created_at)::integer,coalesce(sum(total),0),count(*) from public.v_order_profitability
where business_id=public.current_business_id() and created_at>=now()-make_interval(days=>greatest(p_days,1)) group by extract(hour from created_at) order by sale_hour; $$;
create or replace function public.dashboard_top_products(p_limit integer default 10,p_days integer default 30)
returns table(product_id uuid,product_name text,category text,units_sold numeric,revenue numeric,estimated_profit numeric,estimated_margin numeric)
language sql stable security definer set search_path=public as $$
select p.id,p.name,p.category,coalesce(sum(oi.quantity),0),coalesce(sum(oi.line_total),0),coalesce(sum(oi.quantity*(p.current_price-rc.direct_cost)),0),
case when coalesce(sum(oi.line_total),0)>0 then coalesce(sum(oi.quantity*(p.current_price-rc.direct_cost)),0)/sum(oi.line_total)*100 else 0 end
from public.order_items oi join public.orders o on o.id=oi.order_id join public.products p on p.id=oi.product_id left join public.v_product_recipe_costs rc on rc.product_id=p.id
where o.business_id=public.current_business_id() and o.status='completed' and o.created_at>=now()-make_interval(days=>greatest(p_days,1))
group by p.id,p.name,p.category order by estimated_profit desc,units_sold desc limit greatest(p_limit,1); $$;
create or replace function public.dashboard_inventory_alerts()
returns table(ingredient_id uuid,ingredient_name text,base_unit text,current_quantity numeric,minimum_quantity numeric,target_quantity numeric,suggested_purchase numeric,stock_status text)
language sql stable security definer set search_path=public as $$
select il.ingredient_id,i.name,i.base_unit,il.current_quantity,il.minimum_quantity,il.target_quantity,greatest(il.target_quantity-il.current_quantity,0),
case when il.current_quantity<=0 then 'critical' when il.current_quantity<=il.minimum_quantity then 'low' else 'ok' end
from public.inventory_levels il join public.ingredients i on i.id=il.ingredient_id
where il.business_id=public.current_business_id() and il.current_quantity<=il.minimum_quantity order by case when il.current_quantity<=0 then 1 else 2 end,i.name; $$;
grant select on public.v_product_recipe_costs to authenticated;
grant select on public.v_order_profitability to authenticated;
grant execute on function public.dashboard_summary(timestamptz,timestamptz) to authenticated;
grant execute on function public.dashboard_daily_sales(integer) to authenticated;
grant execute on function public.dashboard_hourly_sales(integer) to authenticated;
grant execute on function public.dashboard_top_products(integer,integer) to authenticated;
grant execute on function public.dashboard_inventory_alerts() to authenticated;
commit;