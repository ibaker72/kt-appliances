"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { ArrowLeft, ArrowRight, CheckCircle2, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";

import { applianceQuickAction, uploadImagesAction } from "@/app/admin/actions";
import { DamageSpotEditor } from "@/components/admin/damage-spot-editor";
import { buttonStyles } from "@/components/ui/button";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGES_PER_UPLOAD,
  initialAdminFormState,
} from "@/lib/admin/appliance-schema";
import { formatBytes, preparePhotos, type ResizedPhoto } from "@/lib/admin/image-resize";
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
  const [pending, setPending] = useState<ResizedPhoto[]>([]);
  const [preparing, setPreparing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Object URLs are a manual allocation. Released on unmount and whenever the
  // selection is replaced, so repeatedly picking photos does not leak.
  useEffect(() => {
    return () => {
      for (const photo of pending) URL.revokeObjectURL(photo.previewUrl);
    };
  }, [pending]);

  const clearSelection = () => {
    setPending([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  /**
   * Shrinks the selection as soon as it is picked, so the owner sees the real
   * upload size before committing and the resizing cost is paid while they are
   * still reading the thumbnails rather than after they press the button.
   */
  const onSelect = async (files: FileList | null) => {
    for (const photo of pending) URL.revokeObjectURL(photo.previewUrl);
    setPending([]);
    if (!files || files.length === 0) return;

    setPreparing(true);
    try {
      setPending(await preparePhotos([...files]));
    } finally {
      setPreparing(false);
    }
  };

  const defaultAlt = `${appliance.brand} ${appliance.title}${
    appliance.modelNumber ? `, model ${appliance.modelNumber}` : ""
  }`;

  return (
    <div className="space-y-5">
      <form
        action={(formData) => {
          // The resized files replace whatever the file input put in the form
          // data. Without the delete, both copies would be submitted under
          // `photos` and every photo would upload twice.
          if (pending.length > 0) {
            formData.delete("photos");
            for (const photo of pending) formData.append("photos", photo.file, photo.file.name);
          }
          formAction(formData);
          clearSelection();
        }}
        className="border border-line bg-white p-5"
      >
        <input type="hidden" name="applianceId" value={appliance.id} />
        <input type="hidden" name="altText" value={defaultAlt} />

        <label
          htmlFor="photos"
          className="block text-ui font-semibold uppercase tracking-wide text-ink-700"
        >
          Add photos
        </label>
        <p className="mt-1 text-[13px] text-ink-500">
          Up to {MAX_IMAGES_PER_UPLOAD} at a time. Photos straight off a phone are fine — they are
          shrunk here before they upload. Shoot the front, then the damage: customers trust a
          listing that shows the dent.
        </p>

        <input
          ref={inputRef}
          id="photos"
          name="photos"
          type="file"
          multiple
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          onChange={(event) => void onSelect(event.target.files)}
          className="mt-3 block w-full cursor-pointer rounded-sm border border-ink-200 bg-white p-3 text-[14px] text-ink-700 file:mr-3 file:cursor-pointer file:rounded-sm file:border-0 file:bg-ink-950 file:px-4 file:py-2.5 file:text-[14px] file:font-semibold file:text-white"
        />

        {preparing ? (
          <p className="mt-3 flex items-center gap-2 text-[13px] font-medium text-ink-700">
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
            Preparing photos…
          </p>
        ) : null}

        {pending.length > 0 ? (
          <div className="mt-3">
            <p className="text-[13px] font-medium text-ink-700">
              {pending.length} photo{pending.length === 1 ? "" : "s"} ready to upload.
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {pending.map((photo) => {
                const shrunk = photo.file.size < photo.originalBytes;
                return (
                  <li key={photo.previewUrl} className="w-24">
                    <div className="relative aspect-square overflow-hidden border border-line bg-bone-100">
                      {/* A local object URL, so next/image would only add an
                          optimizer round trip it cannot serve. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.previewUrl}
                        alt={`Preview of ${photo.file.name}`}
                        className="size-full object-cover"
                      />
                    </div>
                    <p className="mt-1 text-[11px] leading-tight text-ink-500 tnum">
                      {formatBytes(photo.file.size)}
                      {shrunk ? (
                        <span className="block text-ink-400">
                          from {formatBytes(photo.originalBytes)}
                        </span>
                      ) : null}
                    </p>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={clearSelection}
              className="mt-2 text-[12.5px] font-semibold text-ink-600 underline underline-offset-4 hover:text-brand-500"
            >
              Clear selection
            </button>
          </div>
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
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 bg-brand-500 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-white">
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

      {/* Renders nothing until a photo exists — spots are recorded on the photo. */}
      <DamageSpotEditor appliance={appliance} />
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
