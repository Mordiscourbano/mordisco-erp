export function Spinner({
  label = "Cargando",
  size = "md",
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className={`ui-spinner-wrap ui-spinner-${size}`}>
      <span className="ui-spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
