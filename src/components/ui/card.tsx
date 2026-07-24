import { HTMLAttributes, ReactNode } from "react";

type CardVariant =
  | "default"
  | "soft"
  | "outlined"
  | "highlight";

export function Card({
  variant = "default",
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
}) {
  return (
    <section
      className={`ui-card ui-card-${variant} ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="ui-card-header">
      <div>
        <h2 className="ui-card-title">{title}</h2>

        {description && (
          <p className="ui-card-description">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="ui-card-action">
          {action}
        </div>
      )}
    </header>
  );
}

export function CardContent({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`ui-card-content ${className}`}>
      {children}
    </div>
  );
}
