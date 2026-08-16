import Image from "next/image";
import { CATEGORIES, primaryImage, type Appliance } from "@/lib/inventory/types";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  appliance: Appliance;
  /** Index of the image to show. Defaults to the primary image. */
  index?: number;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Adds the shared studio background behind the product. */
  framed?: boolean;
}

/**
 * A product photo, or the category's vector stand-in when a listing has no
 * photography yet. Both render at 4:3 so swapping a placeholder for a real photo
 * never shifts the grid.
 */
export function ProductImage({
  appliance,
  index,
  sizes,
  priority = false,
  className,
  framed = true,
}: ProductImageProps) {
  const image =
    index != null ? (appliance.images[index] ?? primaryImage(appliance)) : primaryImage(appliance);

  const src = image?.imageUrl ?? CATEGORIES[appliance.category].artwork;
  const alt =
    image?.altText?.trim() ||
    [appliance.brand, appliance.title, appliance.modelNumber ? `model ${appliance.modelNumber}` : ""]
      .filter(Boolean)
      .join(" ");

  return (
    <div
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden",
        framed ? "bg-bone-100" : "",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain"
      />
    </div>
  );
}
