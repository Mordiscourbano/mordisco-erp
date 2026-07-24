import { ReactNode } from "react";
export function StatCard({label,value,helper}:{label:ReactNode;value:ReactNode;helper?:ReactNode}){return <article className="ui-stat-card"><span>{label}</span><strong>{value}</strong>{helper&&<small>{helper}</small>}</article>}
