import { TextareaHTMLAttributes } from "react";
export function Textarea({label,hint,error,...props}:TextareaHTMLAttributes<HTMLTextAreaElement>&{label?:string;hint?:string;error?:string}){return <div className={`ui-field ${error?"ui-field-error":""}`}>{label&&<label>{label}</label>}<textarea className="ui-textarea" {...props}/>{(error||hint)&&<small>{error||hint}</small>}</div>}
