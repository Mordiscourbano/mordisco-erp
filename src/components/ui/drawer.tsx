"use client";

import { ReactNode, useEffect } from "react";
import { Button } from "./button";

export function Drawer({
  open,
  title,
  children,
  onClose,
  side = "right",
}: {
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  onClose: () => void;
  side?: "left" | "right";
}) {
  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ui-drawer-layer">
      <button
        className="ui-modal-backdrop"
        aria-label="Cerrar panel"
        onClick={onClose}
      />

      <aside className={`ui-drawer ui-drawer-${side}`}>
        <header>
          <h2>{title}</h2>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            ×
          </Button>
        </header>

        <div className="ui-drawer-content">{children}</div>
      </aside>
    </div>
  );
}
