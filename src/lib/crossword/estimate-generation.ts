/**
 * Honest, calibrated estimate of how long a single fléchés grid takes to
 * generate, in milliseconds. The generator is a blocking constraint solver, so
 * we can't stream true progress — `GenerationProgress` paces its bar against
 * this budget instead.
 *
 * Baselines come from the /fleche generator: a plain 11×17 grid lands in ~12s,
 * and one seeded with custom words (the solver backtracks far more) in ~45s. We
 * scale gently by grid area so smaller presets read faster, and multiply by
 * `count` for callers that want a single bar covering a whole batch.
 */
const BASE_AREA = 11 * 17;

export function estimateGenerationMs({
  width,
  height,
  customCount,
  count = 1,
}: {
  width: number;
  height: number;
  customCount: number;
  count?: number;
}): number {
  const base = customCount > 0 ? 45000 : 12000;
  // Clamp the area factor so tiny grids still read believably and large presets
  // don't blow the estimate out.
  const areaFactor = Math.min(1.4, Math.max(0.5, (width * height) / BASE_AREA));
  return Math.round(base * areaFactor) * Math.max(1, count);
}
