"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { loginAction } from "@/app/admin/actions";
import { Field } from "@/components/forms/form-fields";
import { buttonStyles } from "@/components/ui/button";
import { initialLoginState } from "@/lib/admin/appliance-schema";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonStyles("primary", "lg", "w-full")}>
      {pending ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Signing in…
        </>
      ) : (
        "Sign In"
      )}
    </button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(loginAction, initialLoginState);

  return (
    <form action={formAction}>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        aria-invalid={state.status === "error" ? true : undefined}
      />

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="mt-4 border-l-[3px] border-brand-500 bg-brand-50 py-2 pl-3 text-[14px] font-medium text-ink-900"
        >
          {state.message}
        </p>
      ) : null}

      <div className="mt-5">
        <SubmitButton />
      </div>
    </form>
  );
}
