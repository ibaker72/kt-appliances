import { Container } from "@/components/ui/container";

/** Matches the PDP's gallery-plus-buy-box split so the layout holds steady. */
export default function Loading() {
  return (
    <Container className="py-6 lg:py-8">
      <p className="sr-only" role="status">
        Loading appliance
      </p>
      <div className="grid animate-pulse gap-8 lg:grid-cols-12 lg:gap-10" aria-hidden>
        <div className="lg:col-span-7">
          <div className="aspect-square w-full rounded-md bg-bone-200" />
        </div>
        <div className="space-y-3 lg:col-span-5">
          <div className="h-3 w-20 bg-bone-200" />
          <div className="h-8 w-3/4 bg-bone-200" />
          <div className="h-3.5 w-1/2 bg-bone-100" />
          <div className="h-12 w-40 bg-bone-200" />
          <div className="h-11 w-full bg-bone-200" />
          <div className="h-11 w-full bg-bone-100" />
        </div>
      </div>
    </Container>
  );
}
