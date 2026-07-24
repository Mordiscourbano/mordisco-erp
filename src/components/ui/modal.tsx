'use client';
import { ReactNode } from "react";
export function Modal({open,title,children,onClose}:{open:boolean;title:ReactNode;children:ReactNode;onClose:()=>void}){if(!open)return null;return <div className="ui-modal-layer"><button className="ui-modal-backdrop" onClick={onClose}/><section className="ui-modal"><header><h2>{title}</h2><button onClick={onClose}>×</button></header><div>{children}</div></section></div>}
