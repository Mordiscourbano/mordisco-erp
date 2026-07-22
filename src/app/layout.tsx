import Link from 'next/link';
import './globals.css';
import { LogoutButton } from '@/components/logout-button';

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="es"><body>
    <header className="header"><div className="header-inner"><h1>Mordisco ERP</h1><LogoutButton/></div></header>
    <nav className="nav"><div className="nav-inner">
      <Link href="/">Inicio</Link>
      <Link href="/ingredientes">Ingredientes</Link>
      <Link href="/productos">Productos</Link>
      <Link href="/recetas">Recetas</Link>
      <Link href="/costos">Costos</Link>
    </div></nav>
    <main className="main">{children}</main>
  </body></html>;
}
