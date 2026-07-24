import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="ui-page-header">
      <div>
        <h1>{title}</h1>

        {description && <p>{description}</p>}
      </div>

      {actions && (
        <div className="ui-page-actions">
          {actions}
        </div>
      )}
    </header>
  );
}
