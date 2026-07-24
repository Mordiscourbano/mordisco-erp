export default function SettingsPage() {
  return (
    <>
      <div className="toolbar">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-subtitle">Preferencias generales del sistema.</p>
        </div>
      </div>
      <section className="panel">
        <h2>Identidad del negocio</h2>
        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="field"><label>Nombre comercial</label><input defaultValue="Mordisco Urbano" disabled /></div>
          <div className="field"><label>Sistema</label><input defaultValue="Mordisco ERP" disabled /></div>
        </div>
      </section>
      <section className="grid kpis">
        <article className="card"><span>Versión visual</span><strong>10.2</strong></article>
        <article className="card"><span>Diseño</span><strong>Responsive</strong></article>
        <article className="card"><span>Navegación</span><strong>Sidebar</strong></article>
      </section>
    </>
  );
}
