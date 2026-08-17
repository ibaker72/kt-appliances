"use client";

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
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

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  options: ReadonlyArray<{ value: string; label: string; disabled?: boolean }>;
}

export function SelectField({
  label,
  error,
  hint,
  optional,
  options,
  className,
  id,
  ...props
}: SelectFieldProps) {
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
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(controlBase, "appearance-none", error ? "border-brand-500" : "border-ink-200")}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
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

interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  error?: string;
}

/**
 * Consent checkbox.
 *
 * Never give this a `defaultChecked` or a `checked` prop that starts true. The
 * one place it is used today is SMS consent, where a pre-ticked box is not
 * consent at all — under the TCPA and the carriers' A2P rules the agreement has
 * to be an affirmative act, and a box the visitor merely failed to notice is
 * exactly what an opt-in is not allowed to be.
 *
 * The label carries the full disclosure rather than a summary, because that text
 * is stored with the record and is what would be produced if the consent were
 * ever questioned.
 */
export function CheckboxField({ label, error, className, id, ...props }: CheckboxFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className={className}>
      <div className="flex gap-3">
        <input
          id={fieldId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className="mt-0.5 size-[18px] shrink-0 accent-brand-500"
          {...props}
        />
        <label htmlFor={fieldId} className="text-[13px] leading-relaxed text-ink-600">
          {label}
        </label>
      </div>
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
