import { CategoryPage, categoryMetadata } from "@/components/inventory/category-page";
import type { RawSearchParams } from "@/lib/inventory/search-params";

export const revalidate = 120;

export const metadata = categoryMetadata("washer-dryer-sets");

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return <CategoryPage slug="washer-dryer-sets" searchParams={await searchParams} />;
}
