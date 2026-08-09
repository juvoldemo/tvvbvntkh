"use client";

import { ButtonHTMLAttributes } from "react";
import { X } from "lucide-react";

type CloseIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type"> & {
  label?: string;
};

/** Nút đóng chuẩn dùng chung: chỉ hiển thị icon, không nền và không viền. */
export default function CloseIconButton({ label = "Đóng", className = "", ...props }: CloseIconButtonProps) {
  return <button {...props} type="button" className={`ui-close-button ${className}`.trim()} aria-label={label}><X aria-hidden="true" /></button>;
}
