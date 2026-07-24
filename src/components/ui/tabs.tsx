'use client';
export function Tabs({items,value,onChange}:{items:{id:string;label:string}[];value:string;onChange:(v:string)=>void}){return <div className="ui-tabs">{items.map(i=><button key={i.id} className={value===i.id?"active":""} onClick={()=>onChange(i.id)}>{i.label}</button>)}</div>}
