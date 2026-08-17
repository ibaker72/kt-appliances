import "server-only";

import { unstable_cache } from "next/cache";

import { getNavigationMenu } from "./repository";

/**
 * Cached site-navigation read.
 *
 * The header's mega-menu is built from live inventory and the header renders on
 * every route, so this is cached rather than run per request — without it, every
 * static page in the site would turn dynamic just to draw a nav. Five minutes
 * matches the homepage's revalidate window; warehouse stock does not turn over
 * faster than that.
 *
 * Shared by the `(site)` layout and the root 404, which composes its own shell,
 * so both hit the same cache entry instead of querying twice.
 */
export const getCachedNavigationMenu = unstable_cache(
  getNavigationMenu,
  ["site-navigation-menu"],
  { revalidate: 300, tags: ["inventory"] },
);
