import { InputHTMLAttributes } from "react";

export function Checkbox({
  label,
  description,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description?: string;
}) {
  return (
    <label className={`ui-checkbox ${className}`}>
      <input type="checkbox" {...props} />
      <span className="ui-checkbox-control" aria-hidden="true" />

      <span className="ui-checkbox-copy">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
    </label>
  );
}
