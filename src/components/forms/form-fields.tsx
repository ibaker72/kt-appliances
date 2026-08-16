"use client";

import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full border bg-white px-3.5 py-3 text-[15px] text-ink-950 placeholder:text-ink-400 " +
  "transition-colors focus:border-ink-900 disabled:bg-bone-100";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Rendered next to the label when a field is optional. */
  optional?: boolean;
}

export function Field({ label, error, hint, optional, className, id, ...props }: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const describedBy = [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="mb-1.5 flex items-baseline justify-between gap-2 font-display text-[12px] font-bold uppercase tracking-[0.07em] text-ink-700"
      >
        {label}
        {optional ? <span className="font-sans text-[11px] font-medium normal-case tracking-normal text-ink-400">Optional</span> : null}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(controlBase, error ? "border-brand-500" : "border-ink-200")}
        {...props}
      />
      {hint && !error ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-[12.5px] text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 text-[12.5px] font-medium text-brand-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
}

export function TextAreaField({
  label,
  error,
  hint,
  optional,
  className,
  id,
  ...props
}: TextAreaFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const describedBy = [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <label
        htmlFor={fieldId}
        className="mb-1.5 flex items-baseline justify-between gap-2 font-display text-[12px] font-bold uppercase tracking-[0.07em] text-ink-700"
      >
        {label}
        {optional ? <span className="font-sans text-[11px] font-medium normal-case tracking-normal text-ink-400">Optional</span> : null}
      </label>
      <textarea
        id={fieldId}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(controlBase, "resize-y", error ? "border-brand-500" : "border-ink-200")}
        {...props}
      />
      {hint && !error ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-[12.5px] text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 text-[12.5px] font-medium text-brand-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Honeypot. Positioned off-screen rather than `display:none` because some bots
 * skip hidden inputs; `tabIndex={-1}` and `aria-hidden` keep it away from
 * keyboard and screen-reader users.
 */
export function HoneypotField() {
  return (
    <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
      <label htmlFor="website-url">Website</label>
      <input id="website-url" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
