"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { CheckCircle2, Loader2, MapPin, Trash2 } from "lucide-react";

import { saveDamageSpotsAction } from "@/app/admin/actions";
import { useImageContentBox } from "@/components/inventory/damage-map";
import { buttonStyles } from "@/components/ui/button";
import { MAX_DAMAGE_SPOTS, initialAdminFormState } from "@/lib/admin/appliance-schema";
import type { Appliance, DamageSpot } from "@/lib/inventory/types";

/**
 * Click-to-place damage mapping, under the photo manager.
 *
 * Designed to be a 20-second task per unit: click the mark on the photo, type
 * what it is, save. Anything slower than that never gets used. Keyboard path:
 * "Add a marker" drops one in the centre, and arrow keys nudge the focused
 * marker; Delete removes it.
 *
 * Spots are fractions of the photo's own box (see `useImageContentBox`), so
 * what the owner places here lands on exactly the same part of the appliance
 * on every screen size the shop renders at.
 */

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={buttonStyles("dark", "md", "w-full sm:w-auto")}
    >
      {pending ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Saving…
        </>
      ) : (
        <>
          <MapPin aria-hidden className="size-4" strokeWidth={2.5} />
          Save damage map
        </>
      )}
    </button>
  );
}

export function DamageSpotEditor({ appliance }: { appliance: Appliance }) {
  const [state, formAction] = useActionState(saveDamageSpotsAction, initialAdminFormState);
  const [spots, setSpots] = useState<DamageSpot[]>(appliance.damageSpots);
  const containerRef = useRef<HTMLDivElement>(null);
  const box = useImageContentBox(containerRef);
  const labelRefs = useRef<Array<HTMLInputElement | null>>([]);

  const primary = appliance.images.find((image) => image.isPrimary) ?? appliance.images[0];
  // No photo, no map: coordinates only mean something on a picture.
  if (!primary) return null;

  const clamp = (value: number) => Math.min(1, Math.max(0, Number(value.toFixed(4))));

  const addSpot = (x: number, y: number) => {
    if (spots.length >= MAX_DAMAGE_SPOTS) return;
    const next = [...spots, { x: clamp(x), y: clamp(y), label: "", imageId: null }];
    setSpots(next);
    // Focus the new label input so click → type → save flows without a mouse trip.
    requestAnimationFrame(() => labelRefs.current[next.length - 1]?.focus());
  };

  const placeByClick = (event: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container || !box) return;
    const rect = container.getBoundingClientRect();
    const px = event.clientX - rect.left - box.left;
    const py = event.clientY - rect.top - box.top;
    // Ignore clicks on the letterbox around the photo.
    if (px < 0 || py < 0 || px > box.width || py > box.height) return;
    addSpot(px / box.width, py / box.height);
  };

  const update = (index: number, patch: Partial<DamageSpot>) => {
    setSpots(spots.map((spot, at) => (at === index ? { ...spot, ...patch } : spot)));
  };

  const remove = (index: number) => {
    setSpots(spots.filter((_, at) => at !== index));
  };

  const nudge = (event: React.KeyboardEvent, index: number) => {
    const spot = spots[index];
    const step = 0.02;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        update(index, { x: clamp(spot.x - step) });
        break;
      case "ArrowRight":
        event.preventDefault();
        update(index, { x: clamp(spot.x + step) });
        break;
      case "ArrowUp":
        event.preventDefault();
        update(index, { y: clamp(spot.y - step) });
        break;
      case "ArrowDown":
        event.preventDefault();
        update(index, { y: clamp(spot.y + step) });
        break;
      case "Delete":
      case "Backspace":
        event.preventDefault();
        remove(index);
        break;
    }
  };

  const missingLabels = spots.some((spot) => spot.label.trim().length < 3);

  return (
    <form action={formAction} className="border border-line bg-white p-5">
      <input type="hidden" name="applianceId" value={appliance.id} />
      <input type="hidden" name="spots" value={JSON.stringify(spots)} />

      <h3 className="text-ui font-semibold uppercase tracking-wide text-ink-700">Damage map</h3>
      <p className="mt-1 text-[13px] text-ink-500">
        Click each mark on the main photo, type what it is (&quot;Dent, lower left door — 2
        inches&quot;), save. Buyers get numbered markers on the listing photo. Arrow keys nudge a
        selected marker; Delete removes it.
      </p>

      <div
        ref={containerRef}
        onClick={placeByClick}
        className="relative mt-4 aspect-[4/3] cursor-crosshair overflow-hidden rounded-sm border border-line bg-bone-100"
      >
        <Image
          src={primary.imageUrl}
          alt={primary.altText ?? `${appliance.brand} ${appliance.title}`}
          fill
          sizes="(min-width: 1024px) 640px, 100vw"
          className="object-contain"
        />
        {box
          ? spots.map((spot, index) => (
              <button
                key={index}
                type="button"
                onKeyDown={(event) => nudge(event, index)}
                onClick={(event) => event.stopPropagation()}
                aria-label={`Marker ${index + 1}${spot.label ? `: ${spot.label}` : ""}. Arrow keys move it, Delete removes it.`}
                className="absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-pill bg-brand-500 text-[11px] font-bold text-white ring-2 ring-white"
                style={{
                  left: box.left + spot.x * box.width,
                  top: box.top + spot.y * box.height,
                }}
              >
                {index + 1}
              </button>
            ))
          : null}
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => addSpot(0.5, 0.5)}
          disabled={spots.length >= MAX_DAMAGE_SPOTS}
          className={buttonStyles("outline", "sm")}
        >
          Add a marker at the centre
        </button>
      </div>

      {spots.length > 0 ? (
        <ol className="mt-4 space-y-2.5">
          {spots.map((spot, index) => (
            <li key={index} className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid size-6 shrink-0 place-items-center rounded-pill bg-brand-500 text-[11px] font-bold text-white"
              >
                {index + 1}
              </span>
              <input
                ref={(node) => {
                  labelRefs.current[index] = node;
                }}
                type="text"
                value={spot.label}
                onChange={(event) => update(index, { label: event.target.value })}
                placeholder='e.g. "Dent, lower left door — 2 inches"'
                aria-label={`Description for marker ${index + 1}`}
                maxLength={160}
                className="min-w-0 flex-1 rounded-sm border border-ink-200 px-3 py-2.5 text-ink-900"
              />
              {appliance.images.length > 1 ? (
                <select
                  value={spot.imageId ?? ""}
                  onChange={(event) => update(index, { imageId: event.target.value || null })}
                  aria-label={`Close-up photo for marker ${index + 1}`}
                  className="rounded-sm border border-ink-200 px-2 py-2.5 text-[14px] text-ink-700"
                >
                  <option value="">No close-up</option>
                  {appliance.images.map((image, at) => (
                    <option key={image.id} value={image.id}>
                      Photo {at + 1}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove marker ${index + 1}`}
                className="grid size-10 shrink-0 place-items-center border border-line text-ink-500 transition-colors hover:border-brand-500 hover:bg-brand-500 hover:text-white"
              >
                <Trash2 aria-hidden className="size-4" strokeWidth={2.5} />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-[13px] text-ink-500">
          No spots recorded. That is fine — nothing renders on the listing either way. Never mark
          spots you have not verified on the unit.
        </p>
      )}

      {missingLabels ? (
        <p className="mt-3 text-[13px] font-medium text-ink-700">
          Every marker needs a description before you can save.
        </p>
      ) : null}

      {state.status === "error" ? (
        <p
          role="alert"
          className="mt-4 border-l-[3px] border-brand-500 bg-brand-50 px-3 py-2 text-[13.5px] font-medium text-ink-900"
        >
          {state.message}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 border border-success-600/30 bg-success-50 px-3 py-2 text-[13.5px] font-medium text-success-600"
        >
          <CheckCircle2 aria-hidden className="size-4" strokeWidth={2.5} />
          {state.message}
        </p>
      ) : null}

      <div className="mt-4">
        <SaveButton disabled={missingLabels} />
      </div>
    </form>
  );
}
