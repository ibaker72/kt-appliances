"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import {
  endAdminSession,
  getAdminPassword,
  isAdminConfigured,
  requireAdmin,
  startAdminSession,
} from "@/lib/admin/auth";
import { verifyPassword } from "@/lib/admin/session";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import {
  AdminNotConfiguredError,
  createAppliance,
  deleteAppliance,
  deleteApplianceImage,
  duplicateAppliance,
  reorderImage,
  setApplianceFeatured,
  setAppliancePublished,
  setApplianceStatus,
  setPrimaryImage,
  updateAppliance,
  uploadApplianceImage,
} from "@/lib/admin/inventory-repo";
import { setLeadStatus } from "@/lib/admin/leads-repo";
import { setAppointmentStatus } from "@/lib/admin/appointments-repo";
import {
  MAX_IMAGES_PER_UPLOAD,
  applianceFormSchema,
  validateImageFile,
  type AdminFormState,
  type LoginState,
} from "@/lib/admin/appliance-schema";
import { APPLIANCE_STATUSES, type ApplianceStatus } from "@/lib/inventory/types";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/leads/schema";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "@/lib/appointments/schema";

/**
 * Admin server actions.
 *
 * Every mutating action calls `requireAdmin()` first. Middleware already blocks
 * unauthenticated navigation, but a server action is a callable endpoint in its
 * own right — the check has to be here too, not only at the edge.
 */

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAdminConfigured()) {
    return {
      status: "error",
      message:
        "Admin access is not configured on this deployment. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET.",
    };
  }

  // Brute-force protection: five attempts per IP per five minutes.
  const requestHeaders = await headers();
  const limit = checkRateLimit(clientKey(requestHeaders, "admin-login"), 5, 5 * 60_000);
  if (!limit.ok) {
    return {
      status: "error",
      message: `Too many attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).`,
    };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || !(await verifyPassword(getAdminPassword(), password))) {
    return { status: "error", message: "Incorrect password." };
  }

  await startAdminSession();

  const next = formData.get("next");
  // Only ever redirect to an internal admin path — never to a caller-supplied
  // absolute URL, which would be an open redirect.
  const destination =
    typeof next === "string" && /^\/admin(\/[\w\-/]*)?$/.test(next) ? next : "/admin";
  redirect(destination);
}

export async function logoutAction(): Promise<void> {
  await endAdminSession();
  redirect("/admin/login");
}

/* -------------------------------------------------------------------------- */
/* Inventory                                                                   */
/* -------------------------------------------------------------------------- */

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/**
 * Revalidates every surface an inventory change can appear on. Broad by design:
 * a wrong price lingering on a category page is far more expensive than a few
 * extra cache invalidations.
 */
function revalidateInventory(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/inventory/${slug}`);
}

export async function saveApplianceAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const parsed = applianceFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      errors: fieldErrors(parsed.error.issues),
    };
  }

  const data = parsed.data;

  try {
    if (data.id) {
      await updateAppliance(data.id, data);
      revalidateInventory();
      return { status: "success", message: "Saved.", applianceId: data.id };
    }

    const id = await createAppliance(data);
    revalidateInventory();
    return {
      status: "success",
      message: "Appliance created. Add photos below.",
      applianceId: id,
    };
  } catch (error) {
    if (error instanceof AdminNotConfiguredError) {
      return {
        status: "error",
        message: "No database connected. Set SUPABASE_SERVICE_ROLE_KEY to manage inventory.",
      };
    }
    console.error("[admin] save appliance failed:", error);
    return { status: "error", message: "Could not save. Please try again." };
  }
}

/** Redirect-after-create so the owner lands on the edit page with the photo uploader. */
export async function createAndEditAction(
  prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const result = await saveApplianceAction(prev, formData);
  if (result.status === "success" && !formData.get("id") && result.applianceId) {
    redirect(`/admin/inventory/${result.applianceId}?created=1`);
  }
  return result;
}

export async function uploadImagesAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const applianceId = formData.get("applianceId");
  if (typeof applianceId !== "string" || !applianceId) {
    return { status: "error", message: "Save the appliance before adding photos." };
  }

  const altText = typeof formData.get("altText") === "string" ? String(formData.get("altText")) : "";
  const files = formData
    .getAll("photos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) return { status: "error", message: "Choose at least one photo." };
  if (files.length > MAX_IMAGES_PER_UPLOAD) {
    return { status: "error", message: `Upload up to ${MAX_IMAGES_PER_UPLOAD} photos at a time.` };
  }

  // Validate everything before uploading anything, so a bad file at the end does
  // not leave a half-finished upload behind.
  for (const file of files) {
    const problem = validateImageFile(file);
    if (problem) return { status: "error", message: problem };
  }

  try {
    for (const file of files) {
      await uploadApplianceImage(applianceId, file, altText);
    }
    revalidateInventory();
    return {
      status: "success",
      message: `${files.length} photo${files.length === 1 ? "" : "s"} uploaded.`,
    };
  } catch (error) {
    if (error instanceof AdminNotConfiguredError) {
      return { status: "error", message: "No storage configured. Set SUPABASE_SERVICE_ROLE_KEY." };
    }
    console.error("[admin] image upload failed:", error);
    return { status: "error", message: "Upload failed. Please try again." };
  }
}

/** Small mutations triggered from icon buttons in the table and image list. */
export async function applianceQuickAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const intent = String(formData.get("intent") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    // These two navigate away, so they are handled before the switch — a `case`
    // that throws a redirect reads like a fallthrough bug even when it isn't.
    if (intent === "duplicate") {
      const newId = await duplicateAppliance(id);
      revalidateInventory();
      redirect(`/admin/inventory/${newId}`);
    }
    if (intent === "delete") {
      await deleteAppliance(id);
      revalidateInventory();
      redirect("/admin/inventory");
    }

    switch (intent) {
      case "publish":
        await setAppliancePublished(id, true);
        break;
      case "unpublish":
        await setAppliancePublished(id, false);
        break;
      case "feature":
        await setApplianceFeatured(id, true);
        break;
      case "unfeature":
        await setApplianceFeatured(id, false);
        break;
      case "status": {
        const status = String(formData.get("status") ?? "");
        if ((APPLIANCE_STATUSES as readonly string[]).includes(status)) {
          await setApplianceStatus(id, status as ApplianceStatus);
        }
        break;
      }
      case "image-primary":
        await setPrimaryImage(id, String(formData.get("imageId") ?? ""));
        break;
      case "image-delete":
        await deleteApplianceImage(String(formData.get("imageId") ?? ""));
        break;
      case "image-up":
        await reorderImage(id, String(formData.get("imageId") ?? ""), "up");
        break;
      case "image-down":
        await reorderImage(id, String(formData.get("imageId") ?? ""), "down");
        break;
      default:
        return;
    }
  } catch (error) {
    // `redirect()` throws a control-flow signal that must be re-thrown.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error(`[admin] quick action "${intent}" failed:`, error);
  }

  revalidateInventory();
  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${id}`);
}

/* -------------------------------------------------------------------------- */
/* Leads                                                                       */
/* -------------------------------------------------------------------------- */

export async function updateLeadStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(LEAD_STATUSES as readonly string[]).includes(status)) return;

  try {
    await setLeadStatus(id, status as LeadStatus);
    revalidatePath("/admin/leads");
    revalidatePath("/admin");
  } catch (error) {
    console.error("[admin] lead status update failed:", error);
  }
}

/* -------------------------------------------------------------------------- */
/* Appointments                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Status only. Moving an appointment to `canceled` or `rescheduled` here does
 * not text the customer — the copy for both already exists in
 * `src/lib/appointments/messages.ts`, but firing a customer-facing message from
 * a dropdown while the A2P campaign is still under review is exactly the kind of
 * surprise this work is meant to avoid. Wiring it up is a deliberate follow-up.
 */
export async function updateAppointmentStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !(APPOINTMENT_STATUSES as readonly string[]).includes(status)) return;

  try {
    await setAppointmentStatus(id, status as AppointmentStatus);
    revalidatePath("/admin/appointments");
    revalidatePath("/admin");
  } catch (error) {
    console.error("[admin] appointment status update failed:", error);
  }
}
