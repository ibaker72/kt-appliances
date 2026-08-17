import { cn } from "@/lib/utils";

/**
 * Placeholder matching `ProductCard`'s geometry so nothing shifts when the real
 * card arrives — square image, two title lines, a price line, a fulfillment line.
 */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex animate-pulse flex-col overflow-hidden rounded-md border border-line bg-white",
        className,
      )}
    >
      <div className="aspect-square w-full bg-bone-200" />
      <div className="p-3 sm:p-4">
        <div className="h-3 w-16 bg-bone-200" />
        <div className="mt-2 h-3.5 w-full bg-bone-200" />
        <div className="mt-1.5 h-3.5 w-2/3 bg-bone-200" />
        <div className="mt-3 h-6 w-24 bg-bone-200" />
        <div className="mt-3 h-3 w-1/2 bg-bone-100" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, columns = 4 }: { count?: number; columns?: 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 lg:grid-cols-3",
        columns === 4 ? "xl:grid-cols-4" : "lg:grid-cols-2 xl:grid-cols-3",
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
