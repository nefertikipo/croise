/**
 * Boosted-CPU variant of the fléchés generator, for HARD-but-doable grids
 * (custom words and/or a mot caché). Same handler as the classic endpoint —
 * only the compute tier differs: vercel.json gives this route more memory, which
 * on Vercel means more vCPUs, so the worker pool races across more cores and
 * dense grids finish inside the time budget instead of 500-ing.
 *
 * Easy grids (no custom words, no hidden word) stay on the cheaper classic
 * endpoint. The frontend routes between the two by difficulty (see /fleche).
 */
export { POST, maxDuration } from "@/app/api/fleche/generate/route";
