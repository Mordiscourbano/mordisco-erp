import {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
} from "react";

export function TableContainer({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`ui-table-container ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Table({
  children,
  className = "",
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={`ui-table ${className}`} {...props}>
      {children}
    </table>
  );
}

export function TableEmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td className="ui-table-empty" colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}
