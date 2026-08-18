import type { Metadata } from "next";

import { CategoryPage } from "@/components/inventory/category-page";
import { categoryMetadata } from "@/lib/seo/category-metadata";
import type { RawSearchParams } from "@/lib/inventory/search-params";

export const revalidate = 120;

/**
 * Metadata reads the querystring so a filtered or sorted view canonicalises back
 * to this clean URL and stays out of the index, while the clean URL and its
 * numbered pages remain indexable. See `categoryMetadata`.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  return categoryMetadata("ranges", await searchParams);
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return <CategoryPage slug="ranges" searchParams={await searchParams} />;
}
