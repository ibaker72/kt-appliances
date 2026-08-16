"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CheckCircle2, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";

import { applianceQuickAction, uploadImagesAction } from "@/app/admin/actions";
import { buttonStyles } from "@/components/ui/button";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGES_PER_UPLOAD,
  initialAdminFormState,
} from "@/lib/admin/appliance-schema";
import type { Appliance } from "@/lib/inventory/types";

/**
 * Photo management for a single appliance.
 *
 * Uses a plain multi-file input with `capture` left off so a phone offers both
 * the camera and the photo library — inventory usually gets shot in the
 * warehouse on a phone, and forcing one or the other slows that down.
 */

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonStyles("dark", "md", "w-full sm:w-auto")}>
      {pending ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin" />
          Uploading…
        </>
      ) : (
        <>
          <ImagePlus aria-hidden className="size-4" strokeWidth={2.5} />
          Upload photos
        </>
      )}
    </button>
  );
}

export function ImageManager({ appliance }: { appliance: Appliance }) {
  const [state, formAction] = useActionState(uploadImagesAction, initialAdminFormState);
  const [selectedCount, setSelectedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultAlt = `${appliance.brand} ${appliance.title}${
    appliance.modelNumber ? `, model ${appliance.modelNumber}` : ""
  }`;

  return (
    <div className="space-y-5">
      <form
        action={(formData) => {
          formAction(formData);
          setSelectedCount(0);
          if (inputRef.current) inputRef.current.value = "";
        }}
        className="border border-line bg-white p-5"
      >
        <input type="hidden" name="applianceId" value={appliance.id} />
        <input type="hidden" name="altText" value={defaultAlt} />

        <label
          htmlFor="photos"
          className="block font-display text-[12px] font-bold uppercase tracking-[0.07em] text-ink-700"
        >
          Add photos
        </label>
        <p className="mt-1 text-[13px] text-ink-500">
          Up to {MAX_IMAGES_PER_UPLOAD} at a time, 10 MB each. Shoot the front, then the damage —
          customers trust a listing that shows the dent.
        </p>

        <input
          ref={inputRef}
          id="photos"
          name="photos"
          type="file"
          multiple
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          onChange={(event) => setSelectedCount(event.target.files?.length ?? 0)}
          className="mt-3 block w-full cursor-pointer border border-ink-200 bg-white p-3 text-[14px] text-ink-700 file:mr-3 file:cursor-pointer file:border-0 file:bg-ink-950 file:px-4 file:py-2.5 file:font-display file:text-[12px] file:font-bold file:uppercase file:tracking-[0.06em] file:text-white"
        />

        {selectedCount > 0 ? (
          <p className="mt-2 text-[13px] font-medium text-ink-700">
            {selectedCount} file{selectedCount === 1 ? "" : "s"} ready to upload.
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
          <UploadButton />
        </div>
      </form>

      {appliance.images.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {appliance.images.map((image, index) => (
            <li key={image.id} className="border border-line bg-white">
              <div className="relative aspect-[4/3] bg-bone-100">
                <Image
                  src={image.imageUrl}
                  alt={image.altText ?? ""}
                  fill
                  sizes="(min-width: 1024px) 300px, 45vw"
                  className="object-contain"
                />
                {image.isPrimary ? (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 bg-brand-500 px-2 py-1 font-display text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                    <Star aria-hidden className="size-3" strokeWidth={2.5} />
                    Main
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-line p-2">
                <div className="flex gap-1">
                  <IconAction
                    intent="image-up"
                    applianceId={appliance.id}
                    imageId={image.id}
                    label="Move earlier"
                    disabled={index === 0}
                  >
                    <ArrowLeft aria-hidden className="size-4" strokeWidth={2.5} />
                  </IconAction>
                  <IconAction
                    intent="image-down"
                    applianceId={appliance.id}
                    imageId={image.id}
                    label="Move later"
                    disabled={index === appliance.images.length - 1}
                  >
                    <ArrowRight aria-hidden className="size-4" strokeWidth={2.5} />
                  </IconAction>
                  {!image.isPrimary ? (
                    <IconAction
                      intent="image-primary"
                      applianceId={appliance.id}
                      imageId={image.id}
                      label="Set as main photo"
                    >
                      <Star aria-hidden className="size-4" strokeWidth={2.5} />
                    </IconAction>
                  ) : null}
                </div>

                <IconAction
                  intent="image-delete"
                  applianceId={appliance.id}
                  imageId={image.id}
                  label="Delete photo"
                  destructive
                  confirm="Delete this photo? This cannot be undone."
                >
                  <Trash2 aria-hidden className="size-4" strokeWidth={2.5} />
                </IconAction>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border border-dashed border-ink-200 bg-bone-50 px-5 py-8 text-center text-[14px] text-ink-500">
          No photos yet. The listing will show a generic category illustration until you add one —
          real photos of the actual unit convert far better.
        </p>
      )}
    </div>
  );
}

function IconAction({
  intent,
  applianceId,
  imageId,
  label,
  children,
  disabled = false,
  destructive = false,
  confirm,
}: {
  intent: string;
  applianceId: string;
  imageId: string;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  confirm?: string;
}) {
  return (
    <form
      action={applianceQuickAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="id" value={applianceId} />
      <input type="hidden" name="imageId" value={imageId} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={label}
        title={label}
        className={
          destructive
            ? "grid size-10 place-items-center border border-line text-ink-500 transition-colors hover:border-brand-500 hover:bg-brand-500 hover:text-white disabled:opacity-40"
            : "grid size-10 place-items-center border border-line text-ink-600 transition-colors hover:border-ink-950 hover:text-ink-950 disabled:opacity-40"
        }
      >
        {children}
      </button>
    </form>
  );
}
