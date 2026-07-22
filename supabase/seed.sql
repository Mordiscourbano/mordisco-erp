do $$ declare b uuid; begin
insert into public.businesses(name) values('Mordisco Urbano') returning id into b;
insert into public.fixed_costs(business_id,name,monthly_amount) values(b,'Alquiler',1140000),(b,'Luz',600000),(b,'Internet',40000),(b,'Sueldos',8660000),(b,'Monotributo / IVA',150000),(b,'Contador',150000),(b,'Otros gastos',130000);
insert into public.products(business_id,name,category,current_price) values(b,'Argenta','Milanesas',18000),(b,'Americano','Milanesas',19000),(b,'Tana','Milanesas',18000),(b,'Porteña','Milanesas',25000),(b,'Clásica','Hamburguesas',16000),(b,'Bacon','Hamburguesas',15000),(b,'Tostado JyQ','Tostados',5000),(b,'Tostado Completo','Tostados',5500),(b,'Ensalada Completa','Ensaladas',4000),(b,'Ensalada Caesar','Ensaladas',8000);
insert into public.sales_days(business_id,sale_date,revenue,orders,channel) values(b,'2026-07-01',38586800,5096,'periodo importado');
end $$;
