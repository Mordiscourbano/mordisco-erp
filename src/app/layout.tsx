import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata={title:"Mordisco ERP",description:"Gestión gastronómica"};
const links=[["/","Inicio"],["/ingredientes","Ingredientes"],["/productos","Productos"],["/recetas","Recetas"],["/ventas","Ventas"],["/configuracion","Configuración"]] as const;
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body><header className="header"><div className="header-inner"><div className="brand"><h1>Mordisco ERP</h1><p>Costos, precios y rentabilidad</p></div><span className="badge good">Sprint 0</span></div></header><nav className="nav"><div className="nav-inner">{links.map(([h,l])=><Link key={h} href={h}>{l}</Link>)}</div></nav><main className="main">{children}</main></body></html>}
