import { ProductGridSkeleton } from "@/components/inventory/product-card-skeleton";
import { Container } from "@/components/ui/container";

/** Mirrors the browser's sidebar-plus-grid layout so nothing jumps on load. */
export default function Loading() {
  return (
    <Container className="py-6 sm:py-8">
      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="hidden animate-pulse space-y-4 lg:block" aria-hidden>
          <div className="h-6 w-24 bg-bone-200" />
          {Array.from({ length: 5 }).map((_, group) => (
            <div key={group} className="space-y-2 border-t border-line pt-4">
              <div className="h-3 w-20 bg-bone-200" />
              {Array.from({ length: 4 }).map((_, row) => (
                <div key={row} className="h-3.5 w-full bg-bone-100" />
              ))}
            </div>
          ))}
        </div>
        <div>
          <div aria-hidden className="mb-5 h-11 w-full animate-pulse bg-bone-200" />
          <p className="sr-only" role="status">
            Loading inventory
          </p>
          <ProductGridSkeleton count={12} />
        </div>
      </div>
    </Container>
  );
}
