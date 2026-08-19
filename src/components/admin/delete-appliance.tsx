"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { applianceQuickAction } from "@/app/admin/actions";
import { buttonStyles } from "@/components/ui/button";

/**
 * Permanent delete, behind a typed confirmation.
 *
 * Deleting an appliance removes the row, its image records and the photo files
 * from storage. There is no undo and no backup of the photographs anywhere else
 * — for a scratch & dent unit those pictures are the only record of the exact
 * damage on the exact item that was sold.
 *
 * So this is deliberately awkward. A `window.confirm` was not enough: it is one
 * keystroke away from dismissal and it looks identical to the confirm on the
 * harmless photo-delete button, which trains the reflex that dismisses it.
 * Typing the word is a second, different action, and the panel spends its space
 * pointing at Archive — which is what the owner almost always actually wants.
 */
export function DeleteAppliance({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const armed = typed.trim().toUpperCase() === "DELETE";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 border border-brand-500 px-5 text-ui font-semibold uppercase tracking-wide text-brand-500 transition-colors hover:bg-brand-500 hover:text-white"
      >
        <Trash2 aria-hidden className="size-4" strokeWidth={2.5} />
        Delete permanently
      </button>
    );
  }

  return (
    <form action={applianceQuickAction} className="w-full border border-brand-500 bg-brand-50 p-4">
      <input type="hidden" name="intent" value="delete" />
      <input type="hidden" name="id" value={id} />

      <p className="text-[14.5px] font-semibold text-ink-950">
        Delete {label} and its photos for good?
      </p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-700">
        This cannot be undone. The photographs of this exact unit — including the damage shots —
        are deleted from storage with it. If you only want it off the website,{" "}
        <strong className="font-semibold">Archive</strong> keeps everything and can be undone.
      </p>

      <label htmlFor={`confirm-delete-${id}`} className="mt-4 block text-[13px] font-semibold text-ink-800">
        Type DELETE to confirm
      </label>
      <input
        id={`confirm-delete-${id}`}
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        autoComplete="off"
        className="mt-1.5 h-11 w-full max-w-xs border border-ink-300 bg-white px-3 text-[15px] text-ink-950 sm:w-64"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={!armed}
          className="inline-flex h-11 items-center gap-2 border border-brand-500 bg-brand-500 px-5 text-ui font-semibold uppercase tracking-wide text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 aria-hidden className="size-4" strokeWidth={2.5} />
          Delete permanently
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTyped("");
          }}
          className={buttonStyles("ghost", "md")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
