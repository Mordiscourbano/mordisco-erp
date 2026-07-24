"use client";

import { InputHTMLAttributes } from "react";
import { Input } from "./input";

export function SearchInput(
  props: InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
  }
) {
  return (
    <Input
      type="search"
      prefix="⌕"
      placeholder="Buscar..."
      {...props}
    />
  );
}
