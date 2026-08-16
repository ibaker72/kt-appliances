"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";

import { Button, buttonStyles } from "@/components/ui/button";
import { SORT_LABELS, INVENTORY_SORTS, type InventorySort } from "@/lib/inventory/query";
import {
  APPLIANCE_CONDITIONS,
  CATEGORY_LIST,
  CONDITION_LABELS,
  FUEL_LABELS,
  FUEL_TYPES,
  type ApplianceCategory,
  type ApplianceCondition,
  type FuelType,
} from "@/lib/inventory/types";
import { buildQueryString, type ParsedFilters } from "@/lib/inventory/search-params";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";

interface InventoryFiltersProps {
  filters: ParsedFilters;
  brands: string[];
  priceBounds: { min: number; max: number };
  /** Route the filters write to — `/inventory` or a category page. */
  basePath: string;
  /** Category pages already scope the category, so its control is hidden there. */
  lockCategory?: boolean;
  resultCount: number;
}

type Draft = Pick<
  ParsedFilters,
  "q" | "category" | "brands" | "min" | "max" | "conditions" | "fuelTypes" | "sort" | "showSold"
>;

function toDraft(filters: ParsedFilters): Draft {
  return {
    q: filters.q,
    category: filters.category,
    brands: filters.brands,
    min: filters.min,
    max: filters.max,
    conditions: filters.conditions,
    fuelTypes: filters.fuelTypes,
    sort: filters.sort,
    showSold: filters.showSold,
  };
}

function countActive(draft: Draft): number {
  return (
    (draft.q ? 1 : 0) +
    (draft.category ? 1 : 0) +
    draft.brands.length +
    (draft.min != null ? 1 : 0) +
    (draft.max != null ? 1 : 0) +
    draft.conditions.length +
    draft.fuelTypes.length +
    (draft.showSold ? 1 : 0)
  );
}

export function InventoryFilters({
  filters,
  brands,
  priceBounds,
  basePath,
  lockCategory = false,
  resultCount,
}: InventoryFiltersProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft>(() => toDraft(filters));
  const [sheetOpen, setSheetOpen] = useState(false);

  // Keep the controls in sync when navigation changes the URL (back button, a
  // chip removal, or a link from elsewhere on the site). `filters` is a fresh
  // object every render, so the comparison is against a serialised key; syncing
  // during render avoids showing one frame of stale controls.
  const filtersKey = JSON.stringify(filters);
  const [syncedKey, setSyncedKey] = useState(filtersKey);
  if (syncedKey !== filtersKey) {
    setSyncedKey(filtersKey);
    setDraft(toDraft(filters));
  }

  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  const activeCount = useMemo(() => countActive(draft), [draft]);

  const apply = (next: Draft, options: { close?: boolean } = {}) => {
    setDraft(next);
    // Any filter change returns to page 1 — page 4 of the old result set is
    // meaningless against a new one.
    const href = `${basePath}${buildQueryString({ ...next, page: 1 })}`;
    startTransition(() => {
      router.push(href, { scroll: true });
    });
    track(ANALYTICS_EVENTS.filterApplied, {
      filters: countActive(next),
      category: next.category ?? "all",
      sort: next.sort,
      search: next.q || undefined,
    });
    if (options.close) setSheetOpen(false);
  };

  const clearAll = () => {
    const cleared: Draft = {
      q: "",
      category: lockCategory ? filters.category : undefined,
      brands: [],
      min: undefined,
      max: undefined,
      conditions: [],
      fuelTypes: [],
      sort: "newest",
      showSold: false,
    };
    apply(cleared, { close: true });
  };

  const toggle = <T,>(values: T[], value: T): T[] =>
    values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];

  return (
    <div className="border-y border-line bg-white">
      {/* Search + sort bar */}
      <div className="flex flex-wrap items-center gap-2.5 py-3.5 sm:gap-3">
        <form
          className="relative min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            apply(draft);
          }}
          role="search"
        >
          <label htmlFor="inventory-search" className="sr-only">
            Search inventory by brand, model number or appliance type
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            strokeWidth={2.5}
          />
          <input
            id="inventory-search"
            type="search"
            value={draft.q}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            placeholder="Search brand, model number or type…"
            className="h-11 w-full border border-ink-200 bg-white pl-10 pr-3 text-[15px] text-ink-950 placeholder:text-ink-400 focus:border-ink-900"
          />
        </form>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn(
            buttonStyles("outline", "md"),
            "shrink-0 lg:hidden",
            activeCount > 0 ? "border-brand-500 text-brand-500" : "",
          )}
          aria-expanded={sheetOpen}
        >
          <SlidersHorizontal aria-hidden className="size-4" strokeWidth={2.5} />
          Filters
          {activeCount > 0 ? (
            <span className="ml-0.5 grid size-5 place-items-center bg-brand-500 text-[11px] text-white tnum">
              {activeCount}
            </span>
          ) : null}
        </button>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <label
            htmlFor="inventory-sort"
            className="font-display text-[11.5px] font-bold uppercase tracking-[0.07em] text-ink-500"
          >
            Sort
          </label>
          <select
            id="inventory-sort"
            value={draft.sort}
            onChange={(event) => apply({ ...draft, sort: event.target.value as InventorySort })}
            className="h-11 border border-ink-200 bg-white px-3 text-[14px] text-ink-950 focus:border-ink-900"
          >
            {INVENTORY_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </div>

        {pending ? (
          <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-ink-400" />
        ) : null}
      </div>

      {/* Desktop filter row */}
      <div className="hidden flex-wrap items-end gap-x-6 gap-y-4 border-t border-line py-4 lg:flex">
        {!lockCategory ? (
          <SelectControl
            label="Category"
            value={draft.category ?? ""}
            onChange={(value) =>
              apply({ ...draft, category: (value || undefined) as ApplianceCategory | undefined })
            }
            options={[
              { value: "", label: "All categories" },
              ...CATEGORY_LIST.map((category) => ({ value: category.slug, label: category.name })),
            ]}
          />
        ) : null}

        {brands.length > 0 ? (
          <SelectControl
            label="Brand"
            value={draft.brands[0] ?? ""}
            onChange={(value) => apply({ ...draft, brands: value ? [value] : [] })}
            options={[
              { value: "", label: "All brands" },
              ...brands.map((brand) => ({ value: brand, label: brand })),
            ]}
          />
        ) : null}

        <PriceControl
          min={draft.min}
          max={draft.max}
          bounds={priceBounds}
          onCommit={(min, max) => apply({ ...draft, min, max })}
        />

        <SelectControl
          label="Condition"
          value={draft.conditions[0] ?? ""}
          onChange={(value) =>
            apply({ ...draft, conditions: value ? [value as ApplianceCondition] : [] })
          }
          options={[
            { value: "", label: "Any condition" },
            ...APPLIANCE_CONDITIONS.map((condition) => ({
              value: condition,
              label: CONDITION_LABELS[condition],
            })),
          ]}
        />

        <SelectControl
          label="Fuel type"
          value={draft.fuelTypes[0] ?? ""}
          onChange={(value) => apply({ ...draft, fuelTypes: value ? [value as FuelType] : [] })}
          options={[
            { value: "", label: "Any" },
            ...FUEL_TYPES.map((fuel) => ({ value: fuel, label: FUEL_LABELS[fuel] })),
          ]}
        />

        <SelectControl
          label="Availability"
          value={draft.showSold ? "sold" : "available"}
          onChange={(value) => apply({ ...draft, showSold: value === "sold" })}
          options={[
            { value: "available", label: "Available now" },
            { value: "sold", label: "Recently sold" },
          ]}
        />

        {activeCount > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="mb-0.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-600 underline underline-offset-4 hover:text-brand-500"
          >
            <X aria-hidden className="size-3.5" strokeWidth={2.5} />
            Clear all
          </button>
        ) : null}
      </div>

      {/* Mobile bottom sheet */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-ink-950/55"
            onClick={() => setSheetOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter inventory"
            className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto overscroll-contain bg-white pb-[env(safe-area-inset-bottom)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4">
              <h2 className="font-display text-lg font-bold text-ink-950">Filters</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close filters"
                className="grid size-10 place-items-center border border-line text-ink-700"
              >
                <X aria-hidden className="size-5" strokeWidth={2.5} />
              </button>
            </div>

            <div className="space-y-7 px-5 py-6">
              <SheetGroup label="Sort by">
                <ChipRow
                  options={INVENTORY_SORTS.map((sort) => ({ value: sort, label: SORT_LABELS[sort] }))}
                  selected={[draft.sort]}
                  onSelect={(value) => setDraft({ ...draft, sort: value as InventorySort })}
                />
              </SheetGroup>

              {!lockCategory ? (
                <SheetGroup label="Category">
                  <ChipRow
                    options={[
                      { value: "", label: "All" },
                      ...CATEGORY_LIST.map((category) => ({
                        value: category.slug,
                        label: category.name,
                      })),
                    ]}
                    selected={[draft.category ?? ""]}
                    onSelect={(value) =>
                      setDraft({ ...draft, category: (value || undefined) as ApplianceCategory })
                    }
                  />
                </SheetGroup>
              ) : null}

              {brands.length > 0 ? (
                <SheetGroup label="Brand">
                  <ChipRow
                    multi
                    options={brands.map((brand) => ({ value: brand, label: brand }))}
                    selected={draft.brands}
                    onSelect={(value) => setDraft({ ...draft, brands: toggle(draft.brands, value) })}
                  />
                </SheetGroup>
              ) : null}

              <SheetGroup label="Price">
                <div className="flex items-center gap-3">
                  <NumberInput
                    label="Min price"
                    placeholder={priceBounds.min ? `$${priceBounds.min}` : "No min"}
                    value={draft.min}
                    onChange={(value) => setDraft({ ...draft, min: value })}
                  />
                  <span aria-hidden className="text-ink-400">
                    –
                  </span>
                  <NumberInput
                    label="Max price"
                    placeholder={priceBounds.max ? `$${priceBounds.max}` : "No max"}
                    value={draft.max}
                    onChange={(value) => setDraft({ ...draft, max: value })}
                  />
                </div>
              </SheetGroup>

              <SheetGroup label="Condition">
                <ChipRow
                  multi
                  options={APPLIANCE_CONDITIONS.map((condition) => ({
                    value: condition,
                    label: CONDITION_LABELS[condition],
                  }))}
                  selected={draft.conditions}
                  onSelect={(value) =>
                    setDraft({
                      ...draft,
                      conditions: toggle(draft.conditions, value as ApplianceCondition),
                    })
                  }
                />
              </SheetGroup>

              <SheetGroup label="Fuel type">
                <ChipRow
                  multi
                  options={FUEL_TYPES.map((fuel) => ({ value: fuel, label: FUEL_LABELS[fuel] }))}
                  selected={draft.fuelTypes}
                  onSelect={(value) =>
                    setDraft({ ...draft, fuelTypes: toggle(draft.fuelTypes, value as FuelType) })
                  }
                />
              </SheetGroup>

              <SheetGroup label="Availability">
                <ChipRow
                  options={[
                    { value: "available", label: "Available now" },
                    { value: "sold", label: "Recently sold" },
                  ]}
                  selected={[draft.showSold ? "sold" : "available"]}
                  onSelect={(value) => setDraft({ ...draft, showSold: value === "sold" })}
                />
              </SheetGroup>
            </div>

            <div className="sticky bottom-0 flex gap-3 border-t border-line bg-white px-5 py-4">
              <Button type="button" variant="outline" size="lg" className="flex-1" onClick={clearAll}>
                Clear
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="flex-[2]"
                onClick={() => apply(draft, { close: true })}
              >
                Show {resultCount > 0 ? `${resultCount} ` : ""}results
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- controls */

function SelectControl({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-display text-[11.5px] font-bold uppercase tracking-[0.07em] text-ink-500"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 min-w-[150px] border border-ink-200 bg-white px-3 text-[14px] text-ink-950 focus:border-ink-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PriceControl({
  min,
  max,
  bounds,
  onCommit,
}: {
  min?: number;
  max?: number;
  bounds: { min: number; max: number };
  onCommit: (min?: number, max?: number) => void;
}) {
  const [localMin, setLocalMin] = useState<number | undefined>(min);
  const [localMax, setLocalMax] = useState<number | undefined>(max);

  // Re-sync when the committed range changes underneath us (clear all, back button).
  const boundsKey = `${min ?? ""}|${max ?? ""}`;
  const [syncedBounds, setSyncedBounds] = useState(boundsKey);
  if (syncedBounds !== boundsKey) {
    setSyncedBounds(boundsKey);
    setLocalMin(min);
    setLocalMax(max);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-display text-[11.5px] font-bold uppercase tracking-[0.07em] text-ink-500">
        Price
      </span>
      <div className="flex items-center gap-2">
        <NumberInput
          label="Min price"
          compact
          placeholder={bounds.min ? `$${bounds.min}` : "Min"}
          value={localMin}
          onChange={setLocalMin}
          onBlur={() => onCommit(localMin, localMax)}
        />
        <span aria-hidden className="text-ink-400">
          –
        </span>
        <NumberInput
          label="Max price"
          compact
          placeholder={bounds.max ? `$${bounds.max}` : "Max"}
          value={localMax}
          onChange={setLocalMax}
          onBlur={() => onCommit(localMin, localMax)}
        />
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  compact = false,
}: {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  placeholder?: string;
  compact?: boolean;
}) {
  return (
    <>
      <label className="sr-only" htmlFor={`price-${label.replace(/\s+/g, "-")}`}>
        {label}
      </label>
      <input
        id={`price-${label.replace(/\s+/g, "-")}`}
        type="number"
        inputMode="numeric"
        min={0}
        step={25}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          onChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined);
        }}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onBlur?.();
          }
        }}
        className={cn(
          "border border-ink-200 bg-white px-2.5 text-[14px] text-ink-950 focus:border-ink-900",
          compact ? "h-10 w-[92px]" : "h-12 w-full",
        )}
      />
    </>
  );
}

function SheetGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="eyebrow mb-3 text-ink-500">{label}</h3>
      {children}
    </div>
  );
}

function ChipRow({
  options,
  selected,
  onSelect,
  multi = false,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onSelect: (value: string) => void;
  multi?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value || "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(option.value)}
            className={cn(
              "min-h-11 border px-3.5 py-2 text-[14px] font-medium transition-colors",
              active
                ? "border-ink-950 bg-ink-950 text-white"
                : "border-ink-200 bg-white text-ink-700 hover:border-ink-400",
            )}
          >
            {option.label}
            {multi && active ? <span aria-hidden className="ml-1.5">✕</span> : null}
          </button>
        );
      })}
    </div>
  );
}
