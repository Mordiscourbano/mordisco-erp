import { ReactNode } from "react";
export function Card({children,className=""}:{children:ReactNode;className?:string}){return <section className={`ui-card ${className}`}>{children}</section>}
export function CardHeader({title,description,action}:{title:ReactNode;description?:ReactNode;action?:ReactNode}){return <header className="ui-card-header"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{action}</header>}
