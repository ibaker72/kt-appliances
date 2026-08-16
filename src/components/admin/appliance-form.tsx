"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";

import { createAndEditAction } from "@/app/admin/actions";
import { Field, TextAreaField } from "@/components/forms/form-fields";
import { buttonStyles } from "@/components/ui/button";
import { initialAdminFormState } from "@/lib/admin/appliance-schema";
import {
  APPLIANCE_CONDITIONS,
  APPLIANCE_STATUSES,
  CATEGORY_LIST,
  CONDITION_LABELS,
  FUEL_LABELS,
  FUEL_TYPES,
  STATUS_LABELS,
  type Appliance,
} from "@/lib/inventory/types";
import { cn } from "@/lib/utils";

/**
 * Add / edit appliance form.
 *
 * Ordered the way a unit is actually processed in the warehouse: what it is,
 * what it costs, what is wrong with it, then the optional spec detail. Only five
 * fields are required, so a listing can go up from a phone in about a minute and
 * be filled in later.
 */

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-line bg-white">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-display text-[15px] font-bold uppercase tracking-[0.05em] text-ink-950">
          {title}
        </h2>
        {description ? <p className="mt-1 text-[13px] text-ink-500">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-start gap-3 border border-line px-4 py-3 transition-colors hover:bg-bone-50 has-[:checked]:border-ink-950 has-[:checked]:bg-bone-50">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-[18px] shrink-0 accent-[#c8202b]"
      />
      <span>
        <span className="block text-[14.5px] font-semibold text-ink-950">{label}</span>
        {hint ? <span className="mt-0.5 block text-[12.5px] text-ink-500">{hint}</span> : null}
      </span>
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  hint,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
  hint?: string;
  error?: string;
}) {
  const id = `field-${name}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-display text-[12px] font-bold uppercase tracking-[0.07em] text-ink-700"
      >
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        className={cn(
          "h-[46px] w-full border bg-white px-3 text-[15px] text-ink-950",
          error ? "border-brand-500" : "border-ink-200",
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && !error ? <p className="mt-1.5 text-[12.5px] text-ink-500">{hint}</p> : null}
      {error ? <p className="mt-1.5 text-[12.5px] font-medium text-brand-500">{error}</p> : null}
    </div>
  );
}

function SaveBar({ isNew, slug }: { isNew: boolean; slug?: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex items-center gap-3 border-t border-line bg-white px-4 py-3 sm:-mx-6 sm:px-6">
      <button type="submit" disabled={pending} className={buttonStyles("primary", "lg", "flex-1 sm:flex-none sm:px-10")}>
        {pending ? (
          <>
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Saving…
          </>
        ) : isNew ? (
          "Create Appliance"
        ) : (
          "Save Changes"
        )}
      </button>
      {!isNew && slug ? (
        <Link
          href={`/inventory/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles("outline", "lg", "hidden sm:inline-flex")}
        >
          View listing
          <ExternalLink aria-hidden className="size-3.5" strokeWidth={2.5} />
        </Link>
      ) : null}
      <Link href="/admin/inventory" className={buttonStyles("ghost", "lg")}>
        Cancel
      </Link>
    </div>
  );
}

export function ApplianceForm({ appliance }: { appliance?: Appliance }) {
  const [state, formAction] = useActionState(createAndEditAction, initialAdminFormState);
  const isNew = !appliance;

  // Mirrored locally so the savings preview updates as the owner types, without
  // making the whole form controlled.
  const [price, setPrice] = useState(appliance ? String(appliance.price) : "");
  const [compareAt, setCompareAt] = useState(
    appliance?.compareAtPrice != null ? String(appliance.compareAtPrice) : "",
  );

  const priceValue = Number.parseInt(price.replace(/[^0-9]/g, ""), 10);
  const compareValue = Number.parseInt(compareAt.replace(/[^0-9]/g, ""), 10);
  const savings =
    Number.isFinite(priceValue) && Number.isFinite(compareValue) && compareValue > priceValue
      ? compareValue - priceValue
      : null;

  return (
    <form action={formAction} className="space-y-5">
      {appliance ? <input type="hidden" name="id" value={appliance.id} /> : null}

      {state.status === "success" ? (
        <p
          role="status"
          className="flex items-center gap-2 border border-success-600/30 bg-success-50 px-4 py-3 text-[14px] font-medium text-success-600"
        >
          <CheckCircle2 aria-hidden className="size-4" strokeWidth={2.5} />
          {state.message}
        </p>
      ) : null}

      {state.status === "error" ? (
        <p
          role="alert"
          className="border-l-[3px] border-brand-500 bg-brand-50 px-4 py-3 text-[14px] font-medium text-ink-900"
        >
          {state.message}
        </p>
      ) : null}

      <SectionCard
        title="1 · What is it?"
        description="Brand, category and product name are what customers search on."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Brand"
            name="brand"
            required
            placeholder="Samsung"
            defaultValue={appliance?.brand}
            error={state.errors?.brand}
          />
          <SelectField
            label="Category"
            name="category"
            defaultValue={appliance?.category ?? "refrigerators"}
            error={state.errors?.category}
            options={CATEGORY_LIST.map((category) => ({
              value: category.slug,
              label: category.name,
            }))}
          />
          <Field
            label="Product name"
            name="title"
            required
            placeholder="28 cu. ft. French Door Refrigerator"
            defaultValue={appliance?.title}
            error={state.errors?.title}
            hint="Say what it is and how big — not the brand, that's above."
            className="sm:col-span-2"
          />
          <Field
            label="Model number"
            name="modelNumber"
            placeholder="RF28T5001SR"
            defaultValue={appliance?.modelNumber ?? ""}
            optional
            hint="Worth adding — people search by model number."
            error={state.errors?.modelNumber}
          />
          <Field
            label="Type"
            name="subcategory"
            placeholder="French Door"
            defaultValue={appliance?.subcategory ?? ""}
            optional
            error={state.errors?.subcategory}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="2 · Price"
        description="Only enter a retail comparison if you can verify it for this exact model."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="KT price"
            name="price"
            required
            inputMode="numeric"
            placeholder="899"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            error={state.errors?.price}
            hint="Whole dollars."
          />
          <Field
            label="Retail comparison"
            name="compareAtPrice"
            inputMode="numeric"
            placeholder="1599"
            optional
            value={compareAt}
            onChange={(event) => setCompareAt(event.target.value)}
            error={state.errors?.compareAtPrice}
            hint="Leave blank if unverified."
          />
          <Field
            label="Quantity"
            name="quantity"
            inputMode="numeric"
            defaultValue={String(appliance?.quantity ?? 1)}
            error={state.errors?.quantity}
            hint="How many identical units."
          />
        </div>

        <div className="mt-4 border border-line bg-bone-50 px-4 py-3 text-[13.5px] text-ink-600">
          {savings != null ? (
            <>
              The listing will show{" "}
              <strong className="font-semibold text-ink-950">
                Save ${savings.toLocaleString("en-US")}
              </strong>{" "}
              next to the price.
            </>
          ) : compareAt ? (
            "A comparison price must be higher than the KT price to display. It will be ignored otherwise."
          ) : (
            "No comparison price — the listing will show only the KT price. That is the right choice unless you have verified the retail price for this exact model."
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="3 · Condition"
        description="Be specific about the damage. It is the single biggest trust factor on the listing."
      >
        <div className="grid gap-4">
          <SelectField
            label="Condition"
            name="condition"
            defaultValue={appliance?.condition ?? "scratch-and-dent"}
            error={state.errors?.condition}
            options={APPLIANCE_CONDITIONS.map((condition) => ({
              value: condition,
              label: CONDITION_LABELS[condition],
            }))}
          />
          <TextAreaField
            label="Cosmetic damage"
            name="cosmeticNotes"
            rows={3}
            optional
            defaultValue={appliance?.cosmeticNotes ?? ""}
            placeholder="Dent on the lower right side panel, roughly 4 inches across. Not visible from the front once installed."
            hint="Where it is, how big, and whether it shows once installed."
            error={state.errors?.cosmeticNotes}
          />
          <TextAreaField
            label="What you tested"
            name="functionalNotes"
            rows={2}
            optional
            defaultValue={appliance?.functionalNotes ?? ""}
            placeholder="Cooling, freezer and ice maker tested. Holds temperature on both sections."
            error={state.errors?.functionalNotes}
          />
          <TextAreaField
            label="Description"
            name="description"
            rows={3}
            optional
            defaultValue={appliance?.description ?? ""}
            placeholder="Full-size French door refrigerator with a bottom freezer drawer and adjustable shelving."
            error={state.errors?.description}
          />
        </div>
      </SectionCard>

      <SectionCard title="4 · Services on this unit">
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            name="warrantyAvailable"
            label="Warranty available"
            hint="1-year option can be offered"
            defaultChecked={appliance?.warrantyAvailable ?? true}
          />
          <Toggle
            name="deliveryAvailable"
            label="Delivery available"
            defaultChecked={appliance?.deliveryAvailable ?? true}
          />
          <Toggle
            name="installationAvailable"
            label="Installation available"
            defaultChecked={appliance?.installationAvailable ?? true}
          />
          <Toggle
            name="haulAwayAvailable"
            label="Haul-away available"
            defaultChecked={appliance?.haulAwayAvailable ?? true}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="5 · Specifications"
        description="Optional — but dimensions and fuel type prevent a lot of wasted trips."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Color"
            name="color"
            optional
            placeholder="Stainless Steel"
            defaultValue={appliance?.color ?? ""}
          />
          <Field
            label="Finish"
            name="finish"
            optional
            placeholder="Fingerprint Resistant Stainless"
            defaultValue={appliance?.finish ?? ""}
          />
          <Field
            label="Capacity"
            name="capacity"
            optional
            placeholder="28 cu. ft."
            defaultValue={appliance?.capacity ?? ""}
          />
          <SelectField
            label="Fuel type"
            name="fuelType"
            defaultValue={appliance?.fuelType ?? ""}
            hint="Leave as Not applicable for anything that isn't gas or electric-specific."
            options={[
              { value: "", label: "Not applicable" },
              ...FUEL_TYPES.map((fuel) => ({ value: fuel, label: FUEL_LABELS[fuel] })),
            ]}
          />
          <Field
            label="Dimensions"
            name="dimensions"
            optional
            placeholder={'35.75" W x 34" D x 70" H'}
            defaultValue={appliance?.dimensions ?? ""}
            className="sm:col-span-2"
          />
          <Field
            label="SKU"
            name="sku"
            optional
            placeholder="KT-1041"
            defaultValue={appliance?.sku ?? ""}
            hint="Your internal tag number, if you use one."
          />
          <Field
            label="URL slug"
            name="slug"
            optional
            placeholder="Generated automatically"
            defaultValue={appliance?.slug ?? ""}
            hint="Leave blank and we'll build it from brand, name and model."
          />
        </div>
      </SectionCard>

      <SectionCard
        title="6 · Publish"
        description="Draft and unpublished units are invisible on the website."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Stock status"
            name="status"
            defaultValue={appliance?.status ?? "available"}
            error={state.errors?.status}
            options={APPLIANCE_STATUSES.map((status) => ({
              value: status,
              label: STATUS_LABELS[status],
            }))}
            hint="Marking sold keeps the page live and cross-sells similar units."
          />
          <div className="grid gap-3 self-start">
            <Toggle
              name="published"
              label="Published — visible on the website"
              defaultChecked={appliance?.published ?? true}
            />
            <Toggle
              name="featured"
              label="Feature on the homepage"
              hint="Use for a handful of units at a time"
              defaultChecked={appliance?.featured ?? false}
            />
          </div>
        </div>
      </SectionCard>

      <SaveBar isNew={isNew} slug={appliance?.slug} />
    </form>
  );
}
