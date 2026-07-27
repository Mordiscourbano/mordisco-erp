"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type IOSNavigator = Navigator & {
  standalone?: boolean;
};

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as IOSNavigator).standalone)
  );
}

export function PWAProvider() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("No se pudo registrar el Service Worker:", error);
      });
    }

    if (isStandalone()) return;

    const dismissed =
      window.localStorage.getItem("pwa-install-dismissed") === "true";

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      if (!dismissed) setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);

    let iosTimer: number | undefined;
    if (isIOS() && !dismissed) {
      iosTimer = window.setTimeout(() => {
        setShowIOSHelp(true);
        setVisible(true);
      }, 1200);
    }

    return () => {
      if (iosTimer) window.clearTimeout(iosTimer);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    window.localStorage.setItem("pwa-install-dismissed", "true");
  }

  async function install() {
    if (!installEvent) return;

    await installEvent.prompt();
    await installEvent.userChoice;

    setInstallEvent(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside className="pwa-install-card" aria-label="Instalar Mordisco ERP">
      <button
        type="button"
        className="pwa-install-close"
        onClick={dismiss}
        aria-label="Cerrar aviso de instalación"
      >
        ×
      </button>

      <img
        className="pwa-install-logo"
        src="/icons/icon-192.png"
        alt=""
        width={52}
        height={52}
      />

      <div className="pwa-install-copy">
        <strong>Instalar Mordisco ERP</strong>
        {showIOSHelp ? (
          <p>
            En Safari tocá Compartir y después “Agregar a pantalla de inicio”.
          </p>
        ) : (
          <p>Usalo como una aplicación, sin la barra del navegador.</p>
        )}
      </div>

      {!showIOSHelp && installEvent ? (
        <button
          type="button"
          className="pwa-install-button"
          onClick={install}
        >
          Instalar
        </button>
      ) : null}
    </aside>
  );
}
