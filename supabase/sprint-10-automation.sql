begin;
create table if not exists public.message_templates (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 name text not null, template_type text not null check (template_type in ('order_received','order_ready','birthday','inactive_customer','points_available','promotion','custom')),
 body text not null, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(business_id,name));
create table if not exists public.notification_events (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 notification_type text not null, title text not null, message text not null, severity text not null default 'info' check (severity in ('info','success','warning','critical')),
 entity_type text, entity_id uuid, action_url text, is_read boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.communication_log (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 customer_id uuid references public.customers(id) on delete set null, order_id uuid references public.orders(id) on delete set null,
 template_id uuid references public.message_templates(id) on delete set null, channel text not null default 'whatsapp', recipient text,
 message text not null, status text not null default 'opened', created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now());
alter table public.message_templates enable row level security; alter table public.notification_events enable row level security; alter table public.communication_log enable row level security;
drop policy if exists "templates members read" on public.message_templates; create policy "templates members read" on public.message_templates for select using (business_id=public.current_business_id());
drop policy if exists "templates managers manage" on public.message_templates; create policy "templates managers manage" on public.message_templates for all using (business_id=public.current_business_id() and exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','manager'))) with check (business_id=public.current_business_id());
drop policy if exists "notifications members read" on public.notification_events; create policy "notifications members read" on public.notification_events for select using (business_id=public.current_business_id());
drop policy if exists "notifications members update" on public.notification_events; create policy "notifications members update" on public.notification_events for update using (business_id=public.current_business_id()) with check (business_id=public.current_business_id());
drop policy if exists "communication members read" on public.communication_log; create policy "communication members read" on public.communication_log for select using (business_id=public.current_business_id());
insert into public.message_templates(business_id,name,template_type,body)
select b.id,s.name,s.t,s.body from public.businesses b cross join (values
 ('Pedido recibido','order_received','Hola {{cliente}}. Recibimos tu pedido #{{pedido}} en Mordisco Urbano. Total: {{total}}. Te avisamos cuando esté listo.'),
 ('Pedido listo','order_ready','Hola {{cliente}}. Tu pedido #{{pedido}} ya está listo para retirar. ¡Te esperamos en Mordisco Urbano!'),
 ('Cumpleaños','birthday','¡Feliz cumpleaños, {{cliente}}! En Mordisco Urbano queremos festejar con vos. Consultanos por tu beneficio especial.'),
 ('Cliente inactivo','inactive_customer','Hola {{cliente}}, hace tiempo que no nos visitás. Tenemos una promo especial para que vuelvas a darte un Mordisco.'),
 ('Puntos disponibles','points_available','Hola {{cliente}}. Tenés {{puntos}} puntos disponibles en Mordisco Urbano. Consultanos por los beneficios para canjear.')
) s(name,t,body) on conflict(business_id,name) do nothing;
create or replace function public.render_message_template(p_template_type text,p_customer_id uuid default null,p_order_id uuid default null)
returns table(template_id uuid,template_name text,customer_id uuid,customer_name text,phone text,rendered_message text,whatsapp_url text)
language plpgsql stable security definer set search_path=public as $$
declare vb uuid; vt public.message_templates%rowtype; vc public.customers%rowtype; vo public.orders%rowtype; vm text; vp text;
begin vb:=public.current_business_id(); select * into vt from public.message_templates where business_id=vb and template_type=p_template_type and active=true order by created_at limit 1; if vt.id is null then raise exception 'No existe plantilla activa'; end if;
 if p_customer_id is not null then select * into vc from public.customers where id=p_customer_id and business_id=vb; end if;
 if p_order_id is not null then select * into vo from public.orders where id=p_order_id and business_id=vb; if vc.id is null and vo.customer_id is not null then select * into vc from public.customers where id=vo.customer_id and business_id=vb; end if; end if;
 vm:=vt.body; vm:=replace(vm,'{{cliente}}',coalesce(vc.full_name,'cliente')); vm:=replace(vm,'{{telefono}}',coalesce(vc.phone,'')); vm:=replace(vm,'{{puntos}}',coalesce(vc.loyalty_points,0)::text); vm:=replace(vm,'{{pedido}}',coalesce(vo.order_number::text,'')); vm:=replace(vm,'{{total}}',case when vo.id is not null then '$'||to_char(vo.total,'FM999G999G999') else '' end); vp:=regexp_replace(coalesce(vc.phone,''),'[^0-9]','','g');
 return query select vt.id,vt.name,vc.id,vc.full_name,vc.phone,vm,case when vp<>'' then 'https://wa.me/'||vp||'?text='||replace(replace(replace(replace(replace(vm,'%','%25'),' ','%20'),E'\n','%0A'),'#','%23'),'&','%26') else null end; end $$;
create or replace function public.log_prepared_communication(p_customer_id uuid,p_order_id uuid,p_template_id uuid,p_recipient text,p_message text) returns uuid language plpgsql security definer set search_path=public as $$ declare vb uuid; vid uuid; begin vb:=public.current_business_id(); insert into public.communication_log(business_id,customer_id,order_id,template_id,recipient,message,created_by) values(vb,p_customer_id,p_order_id,p_template_id,p_recipient,p_message,auth.uid()) returning id into vid; return vid; end $$;
create or replace function public.refresh_notification_center() returns integer language plpgsql security definer set search_path=public as $$ declare vb uuid; c integer:=0; begin vb:=public.current_business_id(); delete from public.notification_events where business_id=vb and is_read=false;
 insert into public.notification_events(business_id,notification_type,title,message,severity,entity_type,entity_id,action_url)
 select vb,'stock_critical','Stock crítico: '||r.ingredient_name,'Revisá el inventario y la compra sugerida.',case when r.risk_level='critical' then 'critical' else 'warning' end,'ingredient',r.ingredient_id,'/inventario' from public.intelligence_stock_risk(28) r where r.risk_level in ('critical','warning');
 get diagnostics c=row_count;
 insert into public.notification_events(business_id,notification_type,title,message,severity,entity_type,entity_id,action_url)
 select vb,'customer_action','Contactar: '||a.full_name,a.recommendation,case when a.action_type='winback_urgent' then 'warning' else 'info' end,'customer',a.customer_id,'/automatizaciones' from public.intelligence_customer_actions() a where a.action_type<>'monitor';
 insert into public.notification_events(business_id,notification_type,title,message,severity,entity_type,entity_id,action_url)
 select vb,'kitchen_delay','Pedido demorado #'||o.order_number,'El pedido lleva más de 15 minutos en cocina.','critical','order',o.id,'/cocina' from public.orders o where o.business_id=vb and o.kitchen_status in ('pending','preparing') and o.created_at<now()-interval '15 minutes'; return c; end $$;
create or replace function public.mark_notification_read(p_notification_id uuid) returns void language sql security definer set search_path=public as $$ update public.notification_events set is_read=true where id=p_notification_id and business_id=public.current_business_id(); $$;
grant execute on function public.render_message_template(text,uuid,uuid) to authenticated; grant execute on function public.log_prepared_communication(uuid,uuid,uuid,text,text) to authenticated; grant execute on function public.refresh_notification_center() to authenticated; grant execute on function public.mark_notification_read(uuid) to authenticated;
commit; notify pgrst,'reload schema';
