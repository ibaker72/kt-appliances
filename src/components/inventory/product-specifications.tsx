import {
  CONDITION_LABELS,
  FUEL_LABELS,
  CATEGORIES,
  type Appliance,
} from "@/lib/inventory/types";

/**
 * Specification table. Only rows with real data are rendered — an appliance
 * missing its dimensions simply has no dimensions row, rather than a row reading
 * "N/A" or an invented measurement.
 */
export function ProductSpecifications({ appliance }: { appliance: Appliance }) {
  const rows: Array<[string, string | null]> = [
    ["Brand", appliance.brand],
    ["Model number", appliance.modelNumber],
    ["SKU", appliance.sku],
    ["Category", CATEGORIES[appliance.category].name],
    ["Type", appliance.subcategory],
    ["Condition", CONDITION_LABELS[appliance.condition]],
    ["Color", appliance.color],
    ["Finish", appliance.finish],
    ["Capacity", appliance.capacity],
    ["Dimensions (W × D × H)", appliance.dimensions],
    ["Fuel type", appliance.fuelType ? FUEL_LABELS[appliance.fuelType] : null],
  ];

  const present = rows.filter((row): row is [string, string] => Boolean(row[1]));
  if (present.length === 0) return null;

  return (
    // `table-fixed` stops the table from claiming its min-content width, which
    // would otherwise force the surrounding grid column wider than the viewport
    // on a phone. The overflow guard catches anything genuinely unbreakable.
    <div className="w-full overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-[14.5px]">
        <caption className="sr-only">
          Specifications for the {appliance.brand} {appliance.title}
        </caption>
        <tbody>
          {present.map(([label, value]) => (
            <tr key={label} className="border-b border-line">
              <th
                scope="row"
                className="w-[42%] break-words py-3 pr-4 text-left align-top font-display text-[12px] font-bold uppercase tracking-[0.06em] text-ink-500"
              >
                {label}
              </th>
              <td className="break-words py-3 align-top font-medium text-ink-900">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
