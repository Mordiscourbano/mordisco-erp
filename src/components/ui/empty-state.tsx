import { ReactNode } from "react";
export function EmptyState({title,description,action}:{title:ReactNode;description?:ReactNode;action?:ReactNode}){return <div className="ui-empty"><div>□</div><h3>{title}</h3>{description&&<p>{description}</p>}{action}</div>}
