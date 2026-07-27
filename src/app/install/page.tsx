"use client";

import { useEffect, useState } from "react";

type DeviceKind = "android" | "ios" | "desktop";

function detectDevice(): DeviceKind {
  const agent = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(agent)) return "ios";
  if (/android/.test(agent)) return "android";
  return "desktop";
}

export default function InstallPage() {
  const [device, setDevice] = useState<DeviceKind>("desktop");

  useEffect(() => setDevice(detectDevice()), []);

  return (
    <section className="install-page">
      <div className="install-panel">
        <img
          src="/icons/icon-192.png"
          alt="Mordisco ERP"
          width={96}
          height={96}
        />
        <span className="install-kicker">APP MÓVIL</span>
        <h1>Instalá Mordisco ERP</h1>
        <p className="install-lead">
          Accedé al POS, cocina, inventario y gestión desde el teléfono, como
          una aplicación independiente.
        </p>

        {device === "android" ? (
          <div className="install-instructions">
            <strong>Android · Chrome</strong>
            <ol>
              <li>Abrí el menú de tres puntos.</li>
              <li>Elegí “Instalar aplicación”.</li>
              <li>Confirmá la instalación.</li>
            </ol>
          </div>
        ) : null}

        {device === "ios" ? (
          <div className="install-instructions">
            <strong>iPhone o iPad · Safari</strong>
            <ol>
              <li>Tocá el botón Compartir.</li>
              <li>Elegí “Agregar a pantalla de inicio”.</li>
              <li>Confirmá con “Agregar”.</li>
            </ol>
          </div>
        ) : null}

        {device === "desktop" ? (
          <div className="install-instructions">
            <strong>Desde una computadora</strong>
            <p>
              Abrí esta misma dirección desde el teléfono. Cuando tengamos el
              dominio definitivo, esta pantalla mostrará también el QR de
              instalación permanente.
            </p>
          </div>
        ) : null}

        <a className="install-open-button" href="/">
          Abrir Mordisco ERP
        </a>
      </div>
    </section>
  );
}
