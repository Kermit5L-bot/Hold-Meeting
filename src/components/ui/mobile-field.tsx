import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function MobileInput({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink">
      {label}
      <input
        className="h-11 rounded-md border border-slate-200 px-3 text-base text-ink"
        {...props}
      />
    </label>
  );
}

export function MobileTextarea({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-ink">
      {label}
      <textarea
        className="min-h-24 rounded-md border border-slate-200 px-3 py-2 text-base text-ink"
        {...props}
      />
    </label>
  );
}
