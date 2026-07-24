import { ReactNode } from "react";
export function Alert({variant="info",title,children}:{variant?:"info"|"success"|"warning"|"danger";title?:ReactNode;children:ReactNode}){return <div className={`ui-alert ui-alert-${variant}`}><b>{variant==="success"?"✓":variant==="warning"?"!":variant==="danger"?"×":"i"}</b><div>{title&&<strong>{title}</strong>}<div>{children}</div></div></div>}
