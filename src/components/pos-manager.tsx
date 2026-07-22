'use client';

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Product={id:string;name:string;category:string;current_price:number};
type Customer={id:string;full_name:string;phone:string|null;loyalty_points:number};
type CartItem=Product&{quantity:number};

const money=(value:number)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(value||0);

export function PosManager({products,customers,businessId}:{products:Product[];customers:Customer[];businessId:string}) {
  const [cart,setCart]=useState<CartItem[]>([]);
  const [category,setCategory]=useState("Todos");
  const [search,setSearch]=useState("");
  const [payment,setPayment]=useState("efectivo");
  const [channel,setChannel]=useState("mostrador");
  const [discount,setDiscount]=useState(0);
  const [customerId,setCustomerId]=useState("");
  const [customerSearch,setCustomerSearch]=useState("");
  const [showNewCustomer,setShowNewCustomer]=useState(false);
  const [newCustomerName,setNewCustomerName]=useState("");
  const [newCustomerPhone,setNewCustomerPhone]=useState("");
  const [note,setNote]=useState("");
  const [message,setMessage]=useState("");
  const [saving,setSaving]=useState(false);
  const [customerList,setCustomerList]=useState(customers);

  const categories=useMemo(()=>["Todos",...Array.from(new Set(products.map(p=>p.category)))],[products]);
  const filtered=useMemo(()=>products.filter(p=>(category==="Todos"||p.category===category)&&p.name.toLowerCase().includes(search.toLowerCase())),[products,category,search]);
  const filteredCustomers=useMemo(()=>{const term=customerSearch.toLowerCase().trim();return customerList.filter(c=>!term||c.full_name.toLowerCase().includes(term)||(c.phone??"").includes(term)).slice(0,10)},[customerList,customerSearch]);
  const selectedCustomer=customerList.find(c=>c.id===customerId);
  const subtotal=cart.reduce((t,i)=>t+Number(i.current_price)*i.quantity,0);
  const total=Math.max(subtotal-discount,0);
  const pointsToEarn=customerId?Math.floor(total/1000):0;

  function add(product:Product){setCart(current=>{const exists=current.find(i=>i.id===product.id);return exists?current.map(i=>i.id===product.id?{...i,quantity:i.quantity+1}:i):[...current,{...product,quantity:1}]})}
  function changeQuantity(id:string,quantity:number){setCart(current=>quantity<=0?current.filter(i=>i.id!==id):current.map(i=>i.id===id?{...i,quantity}:i))}

  async function createCustomer(){
    if(!newCustomerName.trim()){setMessage("Ingresá el nombre del cliente.");return}
    const {data,error}=await createClient().from("customers").insert({
      business_id:businessId,full_name:newCustomerName.trim(),
      phone:newCustomerPhone.trim()||null,marketing_opt_in:false
    }).select("id,full_name,phone,loyalty_points").single();
    if(error){setMessage(error.message);return}
    setCustomerList(current=>[...current,data]);
    setCustomerId(data.id);setCustomerSearch(data.full_name);
    setNewCustomerName("");setNewCustomerPhone("");setShowNewCustomer(false);
    setMessage("Cliente creado y seleccionado.");
  }

  async function finishOrder(){
    if(!cart.length){setMessage("El carrito está vacío.");return}
    setSaving(true);setMessage("");
    const {data,error}=await createClient().rpc("register_order",{
      p_items:cart.map(i=>({product_id:i.id,quantity:i.quantity})),
      p_payment_method:payment,p_channel:channel,p_discount:discount,
      p_customer_name:selectedCustomer?.full_name??null,p_note:note||null,
      p_customer_id:customerId||null
    });
    setSaving(false);
    if(error){setMessage(error.message);return}
    setMessage(`Venta registrada. Pedido ${String(data).slice(0,8)}.${pointsToEarn?` Se sumaron ${pointsToEarn} puntos.`:""}`);
    setCart([]);setDiscount(0);setNote("");setCustomerId("");setCustomerSearch("");
  }

  return <>
    <div className="toolbar"><div><h1 className="page-title">Punto de Venta</h1><p className="page-subtitle">Asociá clientes y sumá puntos automáticamente.</p></div></div>
    {message&&<div className={message.includes("registrada")||message.includes("creado")?"success":"error"}>{message}</div>}
    <div className="pos-layout">
      <section className="panel">
        <input className="pos-search" placeholder="Buscar producto..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="pos-categories">{categories.map(item=><button key={item} className={`btn ${category===item?"":"secondary"}`} onClick={()=>setCategory(item)}>{item}</button>)}</div>
        <div className="product-grid">{filtered.map(product=><button className="product-tile" key={product.id} onClick={()=>add(product)}><strong>{product.name}</strong><span>{product.category}</span><b>{money(Number(product.current_price))}</b></button>)}</div>
      </section>

      <aside className="panel cart-panel">
        <h2>Pedido</h2>
        <section className="pos-customer-box">
          <div className="toolbar"><strong>Cliente</strong><button type="button" className="btn secondary" onClick={()=>setShowNewCustomer(!showNewCustomer)}>Nuevo</button></div>
          <input className="pos-search" placeholder="Buscar por nombre o teléfono..." value={customerSearch} onChange={e=>{setCustomerSearch(e.target.value);setCustomerId("")}}/>
          {!customerId&&customerSearch&&<div className="customer-results">{filteredCustomers.map(c=><button key={c.id} type="button" onClick={()=>{setCustomerId(c.id);setCustomerSearch(c.full_name)}}><strong>{c.full_name}</strong><span>{c.phone||"Sin teléfono"} · {c.loyalty_points} puntos</span></button>)}</div>}
          {selectedCustomer&&<div className="selected-customer"><strong>{selectedCustomer.full_name}</strong><span>{selectedCustomer.loyalty_points} puntos actuales · +{pointsToEarn} con esta compra</span><button type="button" onClick={()=>{setCustomerId("");setCustomerSearch("")}}>Quitar</button></div>}
          {showNewCustomer&&<div className="new-customer-form"><input placeholder="Nombre" value={newCustomerName} onChange={e=>setNewCustomerName(e.target.value)}/><input placeholder="Teléfono" value={newCustomerPhone} onChange={e=>setNewCustomerPhone(e.target.value)}/><button type="button" className="btn" onClick={createCustomer}>Crear y seleccionar</button></div>}
        </section>

        <div className="cart-list">{cart.map(item=><div className="cart-row" key={item.id}><div><strong>{item.name}</strong><small>{money(Number(item.current_price))} c/u</small></div><div className="qty-controls"><button onClick={()=>changeQuantity(item.id,item.quantity-1)}>−</button><span>{item.quantity}</span><button onClick={()=>changeQuantity(item.id,item.quantity+1)}>+</button></div><strong>{money(Number(item.current_price)*item.quantity)}</strong></div>)}</div>

        <div className="form-grid">
          <div className="field"><label>Canal</label><select value={channel} onChange={e=>setChannel(e.target.value)}><option value="mostrador">Mostrador</option><option value="rappi">Rappi</option><option value="whatsapp">WhatsApp</option></select></div>
          <div className="field"><label>Pago</label><select value={payment} onChange={e=>setPayment(e.target.value)}><option value="efectivo">Efectivo</option><option value="mercado_pago">Mercado Pago</option><option value="debito">Débito</option><option value="credito">Crédito</option><option value="rappi">Rappi</option></select></div>
          <div className="field"><label>Descuento</label><input type="number" min="0" value={discount} onChange={e=>setDiscount(Number(e.target.value))}/></div>
          <div className="field"><label>Nota</label><input value={note} onChange={e=>setNote(e.target.value)}/></div>
        </div>

        <div className="totals"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Descuento</span><strong>{money(discount)}</strong></div><div className="grand-total"><span>Total</span><strong>{money(total)}</strong></div></div>
        <button className="btn checkout" onClick={finishOrder} disabled={saving}>{saving?"Guardando...":"Cobrar pedido"}</button>
      </aside>
    </div>
  </>
}
