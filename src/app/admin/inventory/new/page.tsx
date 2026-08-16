import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ApplianceForm } from "@/components/admin/appliance-form";
import { requireAdmin } from "@/lib/admin/auth";
import { isSupabaseWritable } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add appliance",
  robots: { index: false, follow: false },
};

export default async function NewAppliancePage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/inventory"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-600 hover:text-brand-500"
      >
        <ArrowLeft aria-hidden className="size-4" strokeWidth={2.5} />
        Back to inventory
      </Link>

      <h1 className="mt-4 font-display text-3xl font-extrabold tracking-[-0.03em] text-ink-950">
        Add an appliance
      </h1>
      <p className="mt-1.5 text-[15px] text-ink-600">
        Brand, category, name, price and condition are all that&apos;s required. Save it, then add
        photos — you can fill in the rest later.
      </p>

      {!isSupabaseWritable ? (
        <p className="mt-6 border-l-[3px] border-brand-500 bg-white px-4 py-3 text-[14px] text-ink-800">
          No database is connected, so saving will fail. Set the Supabase environment variables
          first.
        </p>
      ) : null}

      <div className="mt-6">
        <ApplianceForm />
      </div>
    </div>
  );
}
