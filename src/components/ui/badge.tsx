import { ReactNode } from "react";
export function Badge({variant="neutral",children}:{variant?:"neutral"|"success"|"warning"|"danger"|"info"|"accent";children:ReactNode}){return <span className={`ui-badge ui-badge-${variant}`}>{children}</span>}
