"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Check, ChevronDown, Loader2, SlidersHorizontal, X } from "lucide-react";

import { Button, buttonStyles } from "@/components/ui/button";
import {
  PRICE_BANDS,
  SORT_LABELS,
  INVENTORY_SORTS,
  type InventoryFacets,
  type InventorySort,
} from "@/lib/inventory/query";
import {
  APPLIANCE_CONDITIONS,
  CATEGORY_LIST,
  CONDITION_LABELS,
  FUEL_LABELS,
  type ApplianceCategory,
  type ApplianceCondition,
  type FuelType,
} from "@/lib/inventory/types";
import { buildQueryString, type ParsedFilters } from "@/lib/inventory/search-params";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";

/**
 * Inventory filtering.
 *
 * Filters live in the URL, so this component's only job is to translate control
 * changes into a navigation. Every control is built from `facets` — the distinct
 * values actually present in the catalogue — which means the UI can never offer a
 * filter that returns nothing, and a group disappears entirely when the data
 * behind it does.
 *
 * Two surfaces share one set of controls: a sticky sidebar from `lg` up, which
 * applies each change immediately, and a bottom sheet on phones, which batches
 * changes behind an explicit "Show results".
 */

type Draft = Pick<
  ParsedFilters,
  | "q"
  | "category"
  | "brands"
  | "types"
  | "colors"
  | "min"
  | "max"
  | "conditions"
  | "fuelTypes"
  | "warrantyOnly"
  | "dealsOnly"
  | "sort"
  | "showSold"
>;

function toDraft(filters: ParsedFilters): Draft {
  return {
    q: filters.q,
    category: filters.category,
    brands: filters.brands,
    types: filters.types,
    colors: filters.colors,
    min: filters.min,
    max: filters.max,
    conditions: filters.conditions,
    fuelTypes: filters.fuelTypes,
    warrantyOnly: filters.warrantyOnly,
    dealsOnly: filters.dealsOnly,
    sort: filters.sort,
    showSold: filters.showSold,
  };
}

function countActive(draft: Draft): number {
  return (
    (draft.q ? 1 : 0) +
    (draft.category ? 1 : 0) +
    draft.brands.length +
    draft.types.length +
    draft.colors.length +
    (draft.min != null ? 1 : 0) +
    (draft.max != null ? 1 : 0) +
    draft.conditions.length +
    draft.fuelTypes.length +
    (draft.warrantyOnly ? 1 : 0) +
    (draft.dealsOnly ? 1 : 0) +
    (draft.showSold ? 1 : 0)
  );
}

/** Facet values are free text ("Stainless Steel"), so ids need a safe fragment. */
function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

interface InventoryFiltersProps {
  filters: ParsedFilters;
  facets: InventoryFacets;
  /** Route the filters write to — `/inventory` or a category page. */
  basePath: string;
  /** Category pages already scope the category, so its control is hidden there. */
  lockCategory?: boolean;
  resultCount: number;
}

interface ToolbarProps extends InventoryFiltersProps {
  summary: React.ReactNode;
  /** Cards per row at `xl`. */
  density?: 3 | 4;
  /**
   * Prebuilt hrefs keyed by column count. Deliberately data, not a callback:
   * this is a client component, and a function cannot cross the RSC boundary.
   */
  densityHrefs?: Record<3 | 4, string>;
}

/**
 * Shared filter state, exposed to the browser layout as three pieces: a toolbar
 * (sort + mobile triggers), a desktop sidebar, and the mobile sheets. They are
 * separate render slots because the grid has to sit between them.
 */
function useFilterState({
  filters,
  basePath,
  lockCategory,
}: Pick<InventoryFiltersProps, "filters" | "basePath" | "lockCategory">) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft>(() => toDraft(filters));

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

  const apply = (next: Draft) => {
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
  };

  const clearAll = () => {
    apply({
      q: "",
      category: lockCategory ? filters.category : undefined,
      brands: [],
      types: [],
      colors: [],
      min: undefined,
      max: undefined,
      conditions: [],
      fuelTypes: [],
      warrantyOnly: false,
      dealsOnly: false,
      sort: "featured",
      showSold: false,
    });
  };

  return { draft, setDraft, apply, clearAll, pending, activeCount: countActive(draft) };
}

/* -------------------------------------------------------------------------- */
/* Toolbar — result count, sort, and the mobile filter/sort triggers           */
/* -------------------------------------------------------------------------- */

export function InventoryToolbar({
  filters,
  facets,
  basePath,
  lockCategory = false,
  resultCount,
  summary,
  density,
  densityHrefs,
}: ToolbarProps) {
  const { draft, setDraft, apply, clearAll, pending, activeCount } = useFilterState({
    filters,
    basePath,
    lockCategory,
  });
  const [sheet, setSheet] = useState<"filters" | "sort" | null>(null);

  // Lock the page behind whichever sheet is open.
  useEffect(() => {
    if (!sheet) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheet(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  const sorts = useMemo(
    () => INVENTORY_SORTS.filter((sort) => sort !== "savings" || facets.hasDeals),
    [facets.hasDeals],
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2 text-[14px] text-ink-600">
        {summary}
        {pending ? (
          <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-ink-400" />
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Mobile triggers */}
        <button
          type="button"
          onClick={() => setSheet("filters")}
          aria-expanded={sheet === "filters"}
          className={cn(
            buttonStyles("outline", "md"),
            "lg:hidden",
            activeCount > 0 ? "border-brand-500 text-brand-500" : "",
          )}
        >
          <SlidersHorizontal aria-hidden className="size-4" strokeWidth={2.5} />
          Filters
          {activeCount > 0 ? (
            <span className="ml-0.5 grid size-5 place-items-center bg-brand-500 text-[11px] text-white tnum">
              {activeCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setSheet("sort")}
          aria-expanded={sheet === "sort"}
          className={cn(buttonStyles("outline", "md"), "lg:hidden")}
        >
          <ArrowUpDown aria-hidden className="size-4" strokeWidth={2.5} />
          Sort
        </button>

        {/* Desktop sort */}
        <div className="hidden items-center gap-2 lg:flex">
          <label htmlFor="inventory-sort" className="text-ui font-semibold text-ink-600">
            Sort by
          </label>
          <select
            id="inventory-sort"
            value={draft.sort}
            onChange={(event) => apply({ ...draft, sort: event.target.value as InventorySort })}
            className="h-10 rounded-sm border border-ink-200 bg-white px-3 text-[14px] text-ink-950 focus:border-ink-900"
          >
            {sorts.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </div>

        {/* Density. Links rather than buttons, because it is URL state like
            everything else here and so survives with scripting off. */}
        {density && densityHrefs ? (
          <div className="hidden items-center rounded-sm border border-ink-200 xl:flex">
            {([4, 3] as const).map((cols) => (
              <Link
                key={cols}
                href={densityHrefs[cols]}
                scroll={false}
                aria-label={`Show ${cols} per row`}
                aria-current={density === cols}
                className={cn(
                  "grid h-10 w-10 place-items-center text-ink-600 transition-colors first:rounded-l-sm last:rounded-r-sm",
                  density === cols ? "bg-ink-950 text-white" : "hover:bg-bone-100",
                )}
              >
                <span aria-hidden className="flex gap-[2px]">
                  {Array.from({ length: cols }).map((_, index) => (
                    <span
                      key={index}
                      className={cn(
                        "block h-3.5 w-[3px] rounded-[1px]",
                        density === cols ? "bg-white" : "bg-ink-400",
                      )}
                    />
                  ))}
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {/* Mobile filter sheet */}
      {sheet === "filters" ? (
        <Sheet label="Filter inventory" title="Filters" onClose={() => setSheet(null)}>
          <div className="space-y-1 px-5 py-2">
            <FilterControls
              draft={draft}
              facets={facets}
              lockCategory={lockCategory}
              onChange={setDraft}
              scope="sheet"
            />
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
              onClick={() => {
                apply(draft);
                setSheet(null);
              }}
            >
              Show {resultCount > 0 ? `${resultCount} ` : ""}results
            </Button>
          </div>
        </Sheet>
      ) : null}

      {/* Mobile sort sheet */}
      {sheet === "sort" ? (
        <Sheet label="Sort inventory" title="Sort by" onClose={() => setSheet(null)}>
          <ul className="px-5 py-2">
            {sorts.map((sort) => {
              const active = draft.sort === sort;
              return (
                <li key={sort}>
                  <button
                    type="button"
                    onClick={() => {
                      apply({ ...draft, sort });
                      setSheet(null);
                    }}
                    aria-pressed={active}
                    className="flex min-h-[54px] w-full items-center justify-between gap-3 border-b border-line text-left text-[15px]"
                  >
                    <span className={active ? "font-semibold text-brand-500" : "text-ink-800"}>
                      {SORT_LABELS[sort]}
                    </span>
                    {active ? (
                      <Check aria-hidden className="size-5 shrink-0 text-brand-500" strokeWidth={2.5} />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </Sheet>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sidebar                                                                     */
/* -------------------------------------------------------------------------- */

export function FilterSidebar({
  filters,
  facets,
  basePath,
  lockCategory = false,
}: Omit<InventoryFiltersProps, "resultCount">) {
  const { draft, apply, clearAll, activeCount } = useFilterState({
    filters,
    basePath,
    lockCategory,
  });

  return (
    <aside aria-label="Filter inventory" className="w-full">
      <div className="flex items-center justify-between border-b-2 border-ink-950 pb-3">
        <h2 className="font-display text-[15px] font-bold uppercase tracking-[0.06em] text-ink-950">
          Filters
        </h2>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-600 underline underline-offset-4 hover:text-brand-500"
          >
            <X aria-hidden className="size-3.5" strokeWidth={2.5} />
            Clear all
          </button>
        ) : null}
      </div>

      <FilterControls
        draft={draft}
        facets={facets}
        lockCategory={lockCategory}
        onChange={apply}
        scope="sidebar"
      />
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared controls                                                             */
/* -------------------------------------------------------------------------- */

/**
 * One definition of every filter group, rendered into both the sidebar and the
 * sheet. `onChange` is what differs: the sidebar passes `apply` (navigate now),
 * the sheet passes `setDraft` (stage until "Show results").
 */
function FilterControls({
  draft,
  facets,
  lockCategory,
  onChange,
  scope,
}: {
  draft: Draft;
  facets: InventoryFacets;
  lockCategory: boolean;
  onChange: (next: Draft) => void;
  /**
   * Namespace for control `id`s and radio `name`s. Both surfaces are in the DOM
   * at once — the sidebar is merely `display:none` on phones — so without this
   * they would emit duplicate ids and, worse, share radio groups.
   */
  scope: string;
}) {
  return (
    <div className="divide-y divide-line">
      {!lockCategory ? (
        <FilterGroup label="Category">
          <OptionList
            scope={scope}
            name="category"
            type="radio"
            options={[
              { value: "", label: "All categories" },
              ...CATEGORY_LIST.map((category) => ({ value: category.slug, label: category.name })),
            ]}
            selected={[draft.category ?? ""]}
            onToggle={(value) =>
              onChange({ ...draft, category: (value || undefined) as ApplianceCategory | undefined })
            }
          />
        </FilterGroup>
      ) : null}

      {facets.subcategories.length > 1 ? (
        <FilterGroup label="Appliance type">
          <OptionList
            scope={scope}
            name="type"
            type="checkbox"
            options={facets.subcategories.map((value) => ({ value, label: value }))}
            counts={facets.counts.subcategories}
            selected={draft.types}
            onToggle={(value) => onChange({ ...draft, types: toggle(draft.types, value) })}
          />
        </FilterGroup>
      ) : null}

      {facets.brands.length > 1 ? (
        <FilterGroup label="Brand">
          <OptionList
            scope={scope}
            name="brand"
            type="checkbox"
            options={facets.brands.map((value) => ({ value, label: value }))}
            counts={facets.counts.brands}
            selected={draft.brands}
            onToggle={(value) => onChange({ ...draft, brands: toggle(draft.brands, value) })}
          />
        </FilterGroup>
      ) : null}

      <FilterGroup label="Price">
        <PriceControl
          scope={scope}
          min={draft.min}
          max={draft.max}
          bounds={{ min: facets.minPrice, max: facets.maxPrice }}
          onCommit={(min, max) => onChange({ ...draft, min, max })}
        />
      </FilterGroup>

      <FilterGroup label="Condition">
        <OptionList
          scope={scope}
          name="condition"
          type="checkbox"
          options={APPLIANCE_CONDITIONS.map((condition) => ({
            value: condition,
            label: CONDITION_LABELS[condition],
          }))}
          counts={facets.counts.conditions}
          selected={draft.conditions}
          onToggle={(value) =>
            onChange({ ...draft, conditions: toggle(draft.conditions, value as ApplianceCondition) })
          }
        />
      </FilterGroup>

      {facets.fuelTypes.length > 1 ? (
        <FilterGroup label="Fuel type">
          <OptionList
            scope={scope}
            name="fuel"
            type="checkbox"
            options={facets.fuelTypes.map((fuel) => ({ value: fuel, label: FUEL_LABELS[fuel] }))}
            counts={facets.counts.fuelTypes}
            selected={draft.fuelTypes}
            onToggle={(value) =>
              onChange({ ...draft, fuelTypes: toggle(draft.fuelTypes, value as FuelType) })
            }
          />
        </FilterGroup>
      ) : null}

      {facets.colors.length > 1 ? (
        <FilterGroup label="Color & finish">
          <OptionList
            scope={scope}
            name="color"
            type="checkbox"
            options={facets.colors.map((value) => ({ value, label: value }))}
            counts={facets.counts.colors}
            selected={draft.colors}
            onToggle={(value) => onChange({ ...draft, colors: toggle(draft.colors, value) })}
          />
        </FilterGroup>
      ) : null}

      {facets.hasWarranty || facets.hasDeals ? (
        <FilterGroup label="Offers">
          <ul className="space-y-0.5">
            {facets.hasWarranty ? (
              <CheckRow
                id={`filter-${scope}-warranty`}
                label="Warranty available"
                count={facets.counts.warranty}
                checked={draft.warrantyOnly}
                onChange={(checked) => onChange({ ...draft, warrantyOnly: checked })}
              />
            ) : null}
            {facets.hasDeals ? (
              <CheckRow
                id={`filter-${scope}-deals`}
                label="Marked down from retail"
                hint="Units with a verified retail price on record"
                count={facets.counts.deals}
                checked={draft.dealsOnly}
                onChange={(checked) => onChange({ ...draft, dealsOnly: checked })}
              />
            ) : null}
          </ul>
        </FilterGroup>
      ) : null}

      <FilterGroup label="Availability">
        <OptionList
          scope={scope}
          name="availability"
          type="radio"
          options={[
            { value: "available", label: "Available now" },
            { value: "sold", label: "Recently sold" },
          ]}
          selected={[draft.showSold ? "sold" : "available"]}
          onToggle={(value) => onChange({ ...draft, showSold: value === "sold" })}
        />
      </FilterGroup>
    </div>
  );
}

/**
 * Collapsible filter group.
 *
 * Built on `<details>` so it opens and closes without JavaScript and without
 * this component holding open/closed state for every group on the page.
 */
function FilterGroup({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between py-1 [&::-webkit-details-marker]:hidden">
        <span className="text-ui font-semibold uppercase tracking-wide text-ink-950">{label}</span>
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-ink-500 transition-transform group-open:rotate-180"
          strokeWidth={2.5}
        />
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}

/** Values past this are hidden behind "Show more" — a warehouse carries a lot of brands. */
const OPTION_CUTOFF = 8;

/**
 * Radio or checkbox list with result counts.
 *
 * A count of zero still renders, disabled: seeing that a brand exists in this
 * category but has nothing matching the current filters is more useful than the
 * row silently vanishing, and it stops the list reshuffling on every click.
 */
function OptionList({
  scope,
  name,
  type,
  options,
  selected,
  onToggle,
  counts,
}: {
  scope: string;
  name: string;
  type: "radio" | "checkbox";
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
  /** Keyed lower-case. Omitted for groups where a count means nothing. */
  counts?: Record<string, number>;
}) {
  const [expanded, setExpanded] = useState(false);
  const overflowing = options.length > OPTION_CUTOFF;
  const visible = overflowing && !expanded ? options.slice(0, OPTION_CUTOFF) : options;

  return (
    <>
      <ul className="space-y-0.5">
        {visible.map((option) => {
          const id = `filter-${scope}-${name}-${slug(option.value) || "all"}`;
          const checked = selected.includes(option.value);
          // `tally` omits keys with no matches, so an absent entry is a real zero.
          const count = counts ? (counts[option.value.toLowerCase()] ?? 0) : undefined;
          const empty = count === 0 && !checked;
          return (
            <li key={option.value || "all"}>
              <label
                htmlFor={id}
                className={cn(
                  "flex min-h-9 items-center gap-2.5 py-0.5 text-[14px]",
                  empty
                    ? "cursor-not-allowed text-ink-500"
                    : "cursor-pointer text-ink-800 hover:text-ink-950",
                )}
              >
                <input
                  id={id}
                  type={type}
                  name={`${scope}-${name}`}
                  checked={checked}
                  disabled={empty}
                  onChange={() => onToggle(option.value)}
                  className="size-[16px] shrink-0 accent-brand-500"
                />
                <span className={cn("min-w-0 flex-1 truncate", checked ? "font-semibold text-ink-950" : "")}>
                  {option.label}
                </span>
                {count != null ? (
                  <span className="shrink-0 text-ui text-ink-500 tnum">{count}</span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>

      {overflowing ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-1.5 text-ui font-semibold text-ink-700 underline underline-offset-4 hover:text-brand-500"
        >
          {expanded ? "Show less" : `Show all ${options.length}`}
        </button>
      ) : null}
    </>
  );
}

function CheckRow({
  id,
  label,
  hint,
  count,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  count?: number;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <li>
      <label
        htmlFor={id}
        className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-[14.5px] text-ink-800 hover:text-ink-950"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-[3px] size-[18px] shrink-0 accent-brand-500"
        />
        <span className="min-w-0 flex-1">
          <span className={checked ? "font-semibold text-ink-950" : ""}>{label}</span>
          {hint ? <span className="mt-0.5 block text-[12.5px] text-ink-500">{hint}</span> : null}
        </span>
        {count != null ? <span className="shrink-0 text-ui text-ink-500 tnum">{count}</span> : null}
      </label>
    </li>
  );
}

function PriceControl({
  scope,
  min,
  max,
  bounds,
  onCommit,
}: {
  scope: string;
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
    <div>
      <div className="flex items-center gap-2">
        <NumberInput
          scope={scope}
          label="Min price"
          placeholder={bounds.min ? `$${bounds.min}` : "Min"}
          value={localMin}
          onChange={setLocalMin}
          onBlur={() => onCommit(localMin, localMax)}
        />
        <span aria-hidden className="text-ink-400">
          –
        </span>
        <NumberInput
          scope={scope}
          label="Max price"
          placeholder={bounds.max ? `$${bounds.max}` : "Max"}
          value={localMax}
          onChange={setLocalMax}
          onBlur={() => onCommit(localMin, localMax)}
        />
      </div>
      {/* Presets are dropped when nothing in scope is priced inside them, so a
          band never promises a range the warehouse cannot fill. */}
      <ul className="mt-2.5 flex flex-wrap gap-1.5">
        {PRICE_BANDS.filter(
          (band) =>
            bounds.max > 0 &&
            (band.min == null || band.min <= bounds.max) &&
            (band.max == null || band.max >= bounds.min),
        ).map((band) => {
          const active = min === band.min && max === band.max;
          return (
            <li key={band.label}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onCommit(active ? undefined : band.min, active ? undefined : band.max)}
                className={cn(
                  "rounded-pill border px-2.5 py-1 text-[12.5px] transition-colors",
                  active
                    ? "border-ink-950 bg-ink-950 text-white"
                    : "border-line bg-white text-ink-700 hover:border-ink-400",
                )}
              >
                {band.label}
              </button>
            </li>
          );
        })}
      </ul>

      {bounds.max > 0 ? (
        <p className="mt-2.5 text-[12.5px] text-ink-500 tnum">
          In stock from ${bounds.min.toLocaleString("en-US")} to $
          {bounds.max.toLocaleString("en-US")}
        </p>
      ) : null}
    </div>
  );
}

function NumberInput({
  scope,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
}: {
  scope: string;
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  placeholder?: string;
}) {
  const id = `price-${scope}-${slug(label)}`;
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
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
        className="h-11 w-full min-w-0 border border-ink-200 bg-white px-2.5 text-[14px] text-ink-950 focus:border-ink-900"
      />
    </>
  );
}

/** Bottom sheet shell shared by the filter and sort drawers. */
function Sheet({
  label,
  title,
  onClose,
  children,
}: {
  label: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        aria-label={`Close ${title.toLowerCase()}`}
        className="absolute inset-0 bg-ink-950/55"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-white px-5 py-4">
          <h2 className="font-display text-lg font-bold text-ink-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title.toLowerCase()}`}
            className="grid size-10 place-items-center border border-line text-ink-700"
          >
            <X aria-hidden className="size-5" strokeWidth={2.5} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
