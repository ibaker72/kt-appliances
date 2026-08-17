import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Module resolution for the test runner.
 *
 * Node runs the project's TypeScript directly (type stripping is on by default
 * from Node 22.18), so the suite needs no build step and no test framework — but
 * Node does not know two things the Next.js compiler does:
 *
 *   1. `@/…` maps to `src/…`, per `tsconfig.json` paths.
 *   2. `server-only` is a marker, not a module to execute. Its real entry point
 *      throws outside React's `react-server` condition.
 *
 * Both are handled here rather than by restructuring application code to be
 * test-friendly, which would be the tail wagging the dog.
 */

const projectRoot = path.resolve(import.meta.dirname, "..");
const srcRoot = path.join(projectRoot, "src");
const serverOnlyStub = pathToFileURL(path.join(import.meta.dirname, "stubs/server-only.js")).href;

const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only" || specifier === "client-only") {
    return { url: serverOnlyStub, shortCircuit: true, format: "module" };
  }

  if (specifier.startsWith("@/")) {
    const resolved = firstExisting(path.join(srcRoot, specifier.slice(2)));
    if (resolved) return resolved;
    throw new Error(`Test resolver could not map "${specifier}" under ${srcRoot}`);
  }

  // TypeScript lets a relative import omit its extension (`./schema`); Node's
  // ESM resolver does not. Same lookup, anchored on the importing file.
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const resolved = firstExisting(path.resolve(parentDir, specifier));
    if (resolved) return resolved;
  }

  return nextResolve(specifier, context);
}

/** First candidate that exists as a file, as a resolver result. */
function firstExisting(base) {
  for (const extension of EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }
  return null;
}
