/**
 * Gradient overlays that keep text readable on top of photography.
 *
 * Left-weighted to match the site's left-aligned hero typography: near-opaque
 * ink where the headline sits, transparent where the image should read. The
 * strength is chosen per slide against the actual image — a bright photo needs
 * `heavy` — never assumed. Rendered as a plain div so it costs nothing and
 * works without JavaScript.
 */

export type ScrimStrength = "light" | "medium" | "heavy";

const GRADIENTS: Record<ScrimStrength, string> = {
  light:
    "linear-gradient(to right, rgb(10 11 13 / 0.70) 0%, rgb(10 11 13 / 0.40) 45%, transparent 75%)",
  medium:
    "linear-gradient(to right, rgb(10 11 13 / 0.85) 0%, rgb(10 11 13 / 0.55) 45%, transparent 75%)",
  heavy:
    "linear-gradient(to right, rgb(10 11 13 / 0.94) 0%, rgb(10 11 13 / 0.72) 50%, rgb(10 11 13 / 0.30) 85%)",
};

export function Scrim({ strength }: { strength: ScrimStrength }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ backgroundImage: GRADIENTS[strength] }}
    />
  );
}
