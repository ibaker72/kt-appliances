import { ProductGridSkeleton } from "@/components/inventory/product-card-skeleton";
import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="py-8">
      <p className="sr-only" role="status">
        Loading appliances
      </p>
      <ProductGridSkeleton count={8} />
    </Container>
  );
}
