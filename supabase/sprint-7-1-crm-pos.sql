begin;

create or replace function public.register_order(
  p_items jsonb,
  p_payment_method text default 'efectivo',
  p_channel text default 'mostrador',
  p_discount numeric default 0,
  p_customer_name text default null,
  p_note text default null,
  p_customer_id uuid default null
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
  v_total numeric := 0;
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_price numeric;
  v_recipe_id uuid;
  v_points integer := 0;
  r record;
begin
  v_business := public.current_business_id();
  if v_business is null then raise exception 'Usuario sin negocio vinculado'; end if;
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then raise exception 'El pedido está vacío'; end if;

  if p_customer_id is not null and not exists (
    select 1 from public.customers
    where id = p_customer_id and business_id = v_business and active = true
  ) then raise exception 'Cliente no válido'; end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    if v_quantity <= 0 then raise exception 'Cantidad inválida'; end if;

    select current_price into v_price
    from public.products
    where id = v_product_id and business_id = v_business and active = true;

    if not found then raise exception 'Producto no encontrado o inactivo'; end if;
    v_subtotal := v_subtotal + (v_price * v_quantity);
  end loop;

  v_total := greatest(v_subtotal - greatest(coalesce(p_discount,0),0), 0);

  insert into public.orders (
    business_id,status,channel,payment_method,subtotal,discount,total,
    customer_id,customer_name,note,created_by
  )
  values (
    v_business,'completed',coalesce(nullif(p_channel,''),'mostrador'),
    coalesce(nullif(p_payment_method,''),'efectivo'),v_subtotal,
    greatest(coalesce(p_discount,0),0),v_total,p_customer_id,
    nullif(p_customer_name,''),nullif(p_note,''),auth.uid()
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;

    select current_price into v_price
    from public.products
    where id = v_product_id and business_id = v_business;

    insert into public.order_items(order_id,product_id,quantity,unit_price,note)
    values(v_order_id,v_product_id,v_quantity,v_price,nullif(v_item->>'note',''));

    select id into v_recipe_id
    from public.recipes
    where product_id = v_product_id and business_id = v_business;

    if v_recipe_id is null then raise exception 'El producto no tiene receta'; end if;

    for r in
      select ri.ingredient_id,
        (ri.quantity * v_quantity / greatest(rec.yield_quantity,1)) as used_quantity
      from public.recipe_items ri
      join public.recipes rec on rec.id = ri.recipe_id
      where ri.recipe_id = v_recipe_id
    loop
      insert into public.inventory_levels(business_id,ingredient_id,current_quantity)
      values(v_business,r.ingredient_id,-r.used_quantity)
      on conflict (business_id, ingredient_id)
      do update set
        current_quantity = public.inventory_levels.current_quantity - r.used_quantity,
        updated_at = now();

      insert into public.stock_movements(
        business_id,ingredient_id,movement_type,quantity,reference_type,
        reference_id,note,created_by
      )
      values(
        v_business,r.ingredient_id,'sale',-r.used_quantity,'order',
        v_order_id,'Descuento automático por POS',auth.uid()
      );
    end loop;
  end loop;

  if p_customer_id is not null then
    v_points := floor(v_total / 1000)::integer;

    update public.customers
    set loyalty_points = loyalty_points + v_points
    where id = p_customer_id and business_id = v_business;

    if v_points > 0 then
      insert into public.customer_loyalty_movements(
        business_id,customer_id,order_id,movement_type,points,note,created_by
      )
      values(
        v_business,p_customer_id,v_order_id,'earn',v_points,
        'Puntos generados automáticamente por compra',auth.uid()
      );
    end if;
  end if;

  return v_order_id;
end;
$$;

grant execute on function public.register_order(jsonb,text,text,numeric,text,text,uuid)
to authenticated;

commit;
notify pgrst, 'reload schema';
