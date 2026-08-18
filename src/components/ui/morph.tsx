import * as React from "react";

/**
 * Shared-element morph between routes, used for exactly one transition on the
 * site: a product card's photo morphing into the PDP gallery image. Continuity
 * for the one moment it carries meaning — "this is the same appliance" — and
 * nothing else animates between pages.
 *
 * Built on React's `ViewTransition`, which the App Router's vendored React
 * canary exports (as a symbol element type). It is read dynamically because
 * the npm `react` the test runner loads does not have it — there, and on any
 * React without the export, children render unwrapped. Browsers without the
 * View Transitions API simply don't animate, and the reduced-motion rule in
 * globals.css disables the pseudo-element animations outright. Back/forward
 * navigation reverses the morph natively — it is the same pair of names.
 */

interface ViewTransitionProps {
  name?: string;
  share?: string;
  default?: string;
  children?: React.ReactNode;
}

const ViewTransition = (React as unknown as Record<string, unknown>).ViewTransition as
  | React.ComponentType<ViewTransitionProps>
  | undefined;

export function Morph({ name, children }: { name: string; children: React.ReactNode }) {
  if (!ViewTransition) return <>{children}</>;
  // `default="none"` keeps the named element from crossfading on every
  // unrelated navigation; `share="morph"` keeps the pair morphing anyway.
  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
