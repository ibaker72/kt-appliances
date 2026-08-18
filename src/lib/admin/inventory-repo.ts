import "server-only";

import {
  adminClientConfigProblem,
  getSupabaseAdminClient,
  supabaseStorageBucket,
} from "@/lib/supabase/client";
import {
  parseDamageSpots,
  type Appliance,
  type ApplianceStatus,
  type DamageSpot,
} from "@/lib/inventory/types";
import { slugify } from "@/lib/utils";
import type { ApplianceFormData } from "./appliance-schema";

/**
 * Admin-side inventory access.
 *
 * Uses the service-role client, so it sees drafts and unpublished rows that the
 * public repository cannot. Every function in this module must only be called
 * after `requireAdmin()`.
 */

type Row = Record<string, unknown>;

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableStr(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapRow(row: Row): Appliance {
  const rawImages = Array.isArray(row.appliance_images) ? (row.appliance_images as Row[]) : [];
  return {
    id: str(row.id),
    slug: str(row.slug),
    sku: nullableStr(row.sku),
    title: str(row.title),
    brand: str(row.brand),
    modelNumber: nullableStr(row.model_number),
    category: str(row.category) as Appliance["category"],
    subcategory: nullableStr(row.subcategory),
    description: nullableStr(row.description),
    condition: str(row.condition) as Appliance["condition"],
    cosmeticNotes: nullableStr(row.cosmetic_notes),
    functionalNotes: nullableStr(row.functional_notes),
    damageSpots: parseDamageSpots(row.damage_spots),
    price: num(row.price),
    compareAtPrice: row.compare_at_price == null ? null : num(row.compare_at_price),
    quantity: num(row.quantity),
    status: str(row.status) as ApplianceStatus,
    color: nullableStr(row.color),
    finish: nullableStr(row.finish),
    dimensions: nullableStr(row.dimensions),
    capacity: nullableStr(row.capacity),
    fuelType: nullableStr(row.fuel_type) as Appliance["fuelType"],
    warrantyAvailable: Boolean(row.warranty_available),
    deliveryAvailable: Boolean(row.delivery_available),
    installationAvailable: Boolean(row.installation_available),
    haulAwayAvailable: Boolean(row.haul_away_available),
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    soldAt: nullableStr(row.sold_at),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    images: rawImages
      .map((image) => ({
        id: str(image.id),
        applianceId: str(image.appliance_id),
        imageUrl: str(image.image_url),
        altText: nullableStr(image.alt_text),
        sortOrder: num(image.sort_order),
        isPrimary: Boolean(image.is_primary),
      }))
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder),
  };
}

const SELECT = "*, appliance_images(*)";

export class AdminNotConfiguredError extends Error {
  constructor(detail?: string) {
    super(detail ?? "Supabase service-role credentials are not configured.");
    this.name = "AdminNotConfiguredError";
  }
}

/**
 * PostgreSQL refused the query before RLS was consulted.
 *
 * Raised as its own type because "permission denied for table appliances" reads
 * like a schema fault and is not one: either the API roles were never granted
 * table privileges, or the key in SUPABASE_SERVICE_ROLE_KEY does not resolve to
 * `service_role`. Both are fixable in a minute once named; unwrapped, it reaches
 * the browser as an opaque 500 digest.
 */
export class AdminPermissionError extends Error {
  constructor(public readonly table: string) {
    super(
      `The database refused access to "${table}". Run supabase/migrations/0002_api_role_grants.sql, ` +
        "and confirm SUPABASE_SERVICE_ROLE_KEY holds the project's service-role secret rather than the anon key.",
    );
    this.name = "AdminPermissionError";
  }
}

/** Converts a PostgREST error into the clearest thing we can say about it. */
export function adminQueryError(error: { message: string }): Error {
  const denied = /permission denied for (?:table|relation|schema) ([\w.]+)/i.exec(error.message);
  if (denied) return new AdminPermissionError(denied[1]);
  return new Error(error.message);
}

function client() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new AdminNotConfiguredError(adminClientConfigProblem() ?? undefined);
  return supabase;
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

export interface AdminInventoryQuery {
  search?: string;
  status?: ApplianceStatus | "all";
  category?: string;
  published?: "published" | "unpublished" | "all";
  limit?: number;
  offset?: number;
}

export async function listAppliancesForAdmin(
  query: AdminInventoryQuery = {},
): Promise<{ items: Appliance[]; total: number }> {
  const supabase = client();
  let builder = supabase
    .from("appliances")
    .select(SELECT, { count: "exact" })
    .order("updated_at", { ascending: false });

  if (query.status && query.status !== "all") builder = builder.eq("status", query.status);
  if (query.category) builder = builder.eq("category", query.category);
  if (query.published === "published") builder = builder.eq("published", true);
  if (query.published === "unpublished") builder = builder.eq("published", false);

  const search = query.search?.replace(/[(),*%\\]/g, " ").trim();
  if (search) {
    const pattern = `%${search}%`;
    builder = builder.or(
      [
        `title.ilike.${pattern}`,
        `brand.ilike.${pattern}`,
        `model_number.ilike.${pattern}`,
        `sku.ilike.${pattern}`,
        `slug.ilike.${pattern}`,
      ].join(","),
    );
  }

  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;
  builder = builder.range(offset, offset + limit - 1);

  const { data, error, count } = await builder;
  if (error) throw adminQueryError(error);

  const items = (data ?? []).map((row) => mapRow(row as Row));
  return { items, total: count ?? items.length };
}

export async function getApplianceForAdmin(id: string): Promise<Appliance | null> {
  const supabase = client();
  const { data, error } = await supabase.from("appliances").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw adminQueryError(error);
  return data ? mapRow(data as Row) : null;
}

export async function getInventoryStats(): Promise<{
  available: number;
  reserved: number;
  sold: number;
  draft: number;
  unpublished: number;
  newLeads: number;
}> {
  const supabase = client();

  const [statuses, unpublished, leads] = await Promise.all([
    supabase.from("appliances").select("status").limit(5000),
    supabase.from("appliances").select("id", { count: "exact", head: true }).eq("published", false),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  const counts = { available: 0, reserved: 0, sold: 0, draft: 0 };
  for (const row of (statuses.data ?? []) as Row[]) {
    const status = str(row.status) as keyof typeof counts;
    if (status in counts) counts[status] += 1;
  }

  return { ...counts, unpublished: unpublished.count ?? 0, newLeads: leads.count ?? 0 };
}

/* -------------------------------------------------------------------------- */
/* Slugs                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Builds a readable, unique slug from brand + title + model number.
 * Collisions get a numeric suffix rather than failing the save — the store owner
 * should never see a database uniqueness error.
 */
export async function generateUniqueSlug(
  data: Pick<ApplianceFormData, "brand" | "title" | "modelNumber">,
  excludeId?: string,
): Promise<string> {
  const supabase = client();
  const base =
    slugify([data.brand, data.title, data.modelNumber].filter(Boolean).join(" ")) || "appliance";

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    let builder = supabase.from("appliances").select("id").eq("slug", candidate).limit(1);
    if (excludeId) builder = builder.neq("id", excludeId);
    const { data: existing, error } = await builder;
    if (error) throw adminQueryError(error);
    if (!existing || existing.length === 0) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

function toRow(data: ApplianceFormData, slug: string) {
  return {
    slug,
    sku: data.sku || null,
    title: data.title,
    brand: data.brand,
    model_number: data.modelNumber || null,
    category: data.category,
    subcategory: data.subcategory || null,
    description: data.description || null,
    condition: data.condition,
    cosmetic_notes: data.cosmeticNotes || null,
    functional_notes: data.functionalNotes || null,
    price: data.price,
    compare_at_price: data.compareAtPrice,
    quantity: data.quantity,
    status: data.status,
    color: data.color || null,
    finish: data.finish || null,
    dimensions: data.dimensions || null,
    capacity: data.capacity || null,
    fuel_type: data.fuelType || null,
    warranty_available: data.warrantyAvailable,
    delivery_available: data.deliveryAvailable,
    installation_available: data.installationAvailable,
    haul_away_available: data.haulAwayAvailable,
    featured: data.featured,
    published: data.published,
  };
}

export async function createAppliance(data: ApplianceFormData): Promise<string> {
  const supabase = client();
  const slug = data.slug ? slugify(data.slug) : await generateUniqueSlug(data);

  const { data: created, error } = await supabase
    .from("appliances")
    .insert(toRow(data, slug))
    .select("id")
    .single();

  if (error) throw adminQueryError(error);
  return created.id as string;
}

export async function updateAppliance(id: string, data: ApplianceFormData): Promise<void> {
  const supabase = client();
  const slug = data.slug ? slugify(data.slug) : await generateUniqueSlug(data, id);

  const { error } = await supabase.from("appliances").update(toRow(data, slug)).eq("id", id);
  if (error) throw adminQueryError(error);
}

/**
 * Replaces the recorded damage locations for one unit. Spots are re-parsed on
 * the way in so nothing that is not a well-formed spot can reach the column.
 */
export async function updateDamageSpots(id: string, spots: DamageSpot[]): Promise<void> {
  const supabase = client();
  const { error } = await supabase
    .from("appliances")
    .update({ damage_spots: parseDamageSpots(spots) })
    .eq("id", id);
  if (error) throw adminQueryError(error);
}

/** Copies an appliance (and its image references) as an unpublished draft. */
export async function duplicateAppliance(id: string): Promise<string> {
  const supabase = client();
  const source = await getApplianceForAdmin(id);
  if (!source) throw new Error("Appliance not found.");

  const slug = await generateUniqueSlug({
    brand: source.brand,
    title: `${source.title} copy`,
    modelNumber: source.modelNumber ?? "",
  });

  const { data: created, error } = await supabase
    .from("appliances")
    .insert({
      slug,
      sku: null, // A duplicate is a different physical unit — it needs its own SKU.
      // damage_spots deliberately not copied, for the same reason: the copy's
      // dents are its own. The column defaults to an empty array.
      title: source.title,
      brand: source.brand,
      model_number: source.modelNumber,
      category: source.category,
      subcategory: source.subcategory,
      description: source.description,
      condition: source.condition,
      cosmetic_notes: source.cosmeticNotes,
      functional_notes: source.functionalNotes,
      price: source.price,
      compare_at_price: source.compareAtPrice,
      quantity: source.quantity,
      status: "draft",
      color: source.color,
      finish: source.finish,
      dimensions: source.dimensions,
      capacity: source.capacity,
      fuel_type: source.fuelType,
      warranty_available: source.warrantyAvailable,
      delivery_available: source.deliveryAvailable,
      installation_available: source.installationAvailable,
      haul_away_available: source.haulAwayAvailable,
      featured: false,
      published: false,
    })
    .select("id")
    .single();

  if (error) throw adminQueryError(error);
  const newId = created.id as string;

  if (source.images.length > 0) {
    const { error: imageError } = await supabase.from("appliance_images").insert(
      source.images.map((image, index) => ({
        appliance_id: newId,
        image_url: image.imageUrl,
        alt_text: image.altText,
        sort_order: index,
        is_primary: index === 0,
      })),
    );
    if (imageError) console.error("[admin] duplicate images failed:", imageError.message);
  }

  return newId;
}

export async function setApplianceStatus(id: string, status: ApplianceStatus): Promise<void> {
  const supabase = client();
  // `sold_at` is maintained by a database trigger, so status is the only field
  // that has to change here.
  const { error } = await supabase.from("appliances").update({ status }).eq("id", id);
  if (error) throw adminQueryError(error);
}

export async function setAppliancePublished(id: string, published: boolean): Promise<void> {
  const supabase = client();
  const { error } = await supabase.from("appliances").update({ published }).eq("id", id);
  if (error) throw adminQueryError(error);
}

export async function setApplianceFeatured(id: string, featured: boolean): Promise<void> {
  const supabase = client();
  const { error } = await supabase.from("appliances").update({ featured }).eq("id", id);
  if (error) throw adminQueryError(error);
}

export async function deleteAppliance(id: string): Promise<void> {
  const supabase = client();
  const appliance = await getApplianceForAdmin(id);

  // Remove the stored files first; orphaned objects in the bucket cost money
  // and are hard to find later. Image rows cascade with the appliance.
  if (appliance) {
    const paths = appliance.images
      .map((image) => storagePathFromUrl(image.imageUrl))
      .filter((path): path is string => Boolean(path));
    if (paths.length > 0) {
      await supabase.storage.from(supabaseStorageBucket).remove(paths);
    }
  }

  const { error } = await supabase.from("appliances").delete().eq("id", id);
  if (error) throw adminQueryError(error);
}

/* -------------------------------------------------------------------------- */
/* Images                                                                      */
/* -------------------------------------------------------------------------- */

/** Recovers the object path from a public storage URL, for deletion. */
function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${supabaseStorageBucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

export async function uploadApplianceImage(
  applianceId: string,
  file: File,
  altText: string,
): Promise<void> {
  const supabase = client();

  const extension = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${applianceId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension || "jpg"}`;

  const { error: uploadError } = await supabase.storage
    .from(supabaseStorageBucket)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from(supabaseStorageBucket).getPublicUrl(path);

  // First image uploaded becomes the primary one automatically.
  const { count } = await supabase
    .from("appliance_images")
    .select("id", { count: "exact", head: true })
    .eq("appliance_id", applianceId);

  const existing = count ?? 0;

  const { error: insertError } = await supabase.from("appliance_images").insert({
    appliance_id: applianceId,
    image_url: publicUrl,
    alt_text: altText || null,
    sort_order: existing,
    is_primary: existing === 0,
  });
  if (insertError) {
    // Roll the file back so a failed insert does not leave an orphan behind.
    await supabase.storage.from(supabaseStorageBucket).remove([path]);
    throw new Error(insertError.message);
  }
}

export async function deleteApplianceImage(imageId: string): Promise<void> {
  const supabase = client();

  const { data, error } = await supabase
    .from("appliance_images")
    .select("id, appliance_id, image_url, is_primary")
    .eq("id", imageId)
    .maybeSingle();
  if (error) throw adminQueryError(error);
  if (!data) return;

  const { error: deleteError } = await supabase.from("appliance_images").delete().eq("id", imageId);
  if (deleteError) throw new Error(deleteError.message);

  const path = storagePathFromUrl(str(data.image_url));
  if (path) await supabase.storage.from(supabaseStorageBucket).remove([path]);

  // If the primary image was removed, promote the next one so the listing never
  // loses its lead photo.
  if (data.is_primary) {
    const { data: remaining } = await supabase
      .from("appliance_images")
      .select("id")
      .eq("appliance_id", str(data.appliance_id))
      .order("sort_order", { ascending: true })
      .limit(1);
    if (remaining && remaining.length > 0) {
      await supabase.from("appliance_images").update({ is_primary: true }).eq("id", remaining[0].id);
    }
  }
}

export async function setPrimaryImage(applianceId: string, imageId: string): Promise<void> {
  const supabase = client();
  // Clear first: a partial unique index allows only one primary per appliance.
  await supabase.from("appliance_images").update({ is_primary: false }).eq("appliance_id", applianceId);
  const { error } = await supabase
    .from("appliance_images")
    .update({ is_primary: true })
    .eq("id", imageId);
  if (error) throw adminQueryError(error);
}

export async function reorderImage(
  applianceId: string,
  imageId: string,
  direction: "up" | "down",
): Promise<void> {
  const supabase = client();
  const { data, error } = await supabase
    .from("appliance_images")
    .select("id, sort_order")
    .eq("appliance_id", applianceId)
    .order("sort_order", { ascending: true });
  if (error) throw adminQueryError(error);

  const images = (data ?? []) as Array<{ id: string; sort_order: number }>;
  const index = images.findIndex((image) => image.id === imageId);
  if (index === -1) return;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= images.length) return;

  [images[index], images[target]] = [images[target], images[index]];

  await Promise.all(
    images.map((image, position) =>
      supabase.from("appliance_images").update({ sort_order: position }).eq("id", image.id),
    ),
  );
}
