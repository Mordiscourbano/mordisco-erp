import { SelectHTMLAttributes } from "react";
export function Select({label,hint,error,children,...props}:SelectHTMLAttributes<HTMLSelectElement>&{label?:string;hint?:string;error?:string}){return <div className={`ui-field ${error?"ui-field-error":""}`}>{label&&<label>{label}</label>}<select className="ui-select" {...props}>{children}</select>{(error||hint)&&<small>{error||hint}</small>}</div>}
