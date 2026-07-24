export default function TemplatesPage() {
  return (
    <>
      <div className="toolbar">
        <div>
          <h1 className="page-title">Plantillas</h1>
          <p className="page-subtitle">
            Mensajes prearmados para WhatsApp y comunicaciones.
          </p>
        </div>
      </div>

      <section className="panel">
        <h2>Plantillas de mensajes</h2>
        <p className="page-subtitle" style={{ marginTop: 8 }}>
          Esta sección quedará disponible para crear, editar y organizar
          mensajes de pedido recibido, pedido listo, promociones y campañas.
        </p>
      </section>
    </>
  );
}
