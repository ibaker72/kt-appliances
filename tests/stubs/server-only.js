/**
 * Stand-in for the `server-only` package.
 *
 * The real package resolves to a module that throws unless the importer is
 * running under React's `react-server` condition — which is the whole point of
 * it, and which plain Node is not. The test runner substitutes this no-op so the
 * server modules can be imported directly.
 *
 * Note what this does *not* do: it does not weaken the guarantee in the
 * application. The marker still turns any attempt to import these modules from a
 * client component into a build error. It is bypassed here only, for the runner.
 */
export {};
