// Sweep: remove every em/en dash from all published content docs, replacing with
// a comma (grammatically safe in French). Runs over whatever is live, regardless
// of which seed produced it.
// Usage: SANITY_WRITE_TOKEN=xxx node scripts/strip-dashes.mjs

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "bpesgoqn";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = "2026-02-01";
const token = process.env.SANITY_WRITE_TOKEN;
if (!token) {
  console.error("Missing SANITY_WRITE_TOKEN");
  process.exit(1);
}

const TYPES = ["article", "seoLandingPage", "giftGuide", "faq", "author", "category", "siteSettings"];
const VOLATILE = new Set(["_rev", "_createdAt", "_updatedAt", "_system"]);

const hasDash = (s) => typeof s === "string" && /[—–]/.test(s);
const clean = (s) =>
  typeof s === "string"
    ? s
        .replace(/\s*[—–]\s*/g, ", ")
        .replace(/,\s*,/g, ",")
        .replace(/\s+,/g, ",")
        .replace(/,\s*([.!?])/g, "$1")
    : s;

let changed = false;
const deep = (v) => {
  if (Array.isArray(v)) return v.map(deep);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v)
        .filter(([k]) => !VOLATILE.has(k))
        .map(([k, val]) => [k, deep(val)]),
    );
  }
  if (hasDash(v)) changed = true;
  return clean(v);
};

const base = `https://${projectId}.api.sanity.io/v${apiVersion}/data`;
const query = `*[_type in $types && !(_id in path("drafts.**"))]`;
const qUrl = `${base}/query/${dataset}?query=${encodeURIComponent(query)}&$types=${encodeURIComponent(JSON.stringify(TYPES))}`;

const qRes = await fetch(qUrl, { headers: { Authorization: `Bearer ${token}` } });
const { result: docs } = await qRes.json();
if (!docs) {
  console.error("No docs fetched");
  process.exit(1);
}

const mutations = [];
for (const doc of docs) {
  changed = false;
  const cleaned = deep(doc);
  if (changed) mutations.push({ createOrReplace: cleaned });
}

if (!mutations.length) {
  console.log(`Scanned ${docs.length} docs. No em/en dashes found. Nothing to do.`);
  process.exit(0);
}

const mRes = await fetch(`${base}/mutate/${dataset}?returnIds=true`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ mutations }),
});
const mJson = await mRes.json();
if (!mRes.ok) {
  console.error("Mutation failed:", JSON.stringify(mJson, null, 2));
  process.exit(1);
}
console.log(`Scanned ${docs.length} docs; cleaned ${mutations.length}:`);
console.log((mJson.results || []).map((r) => `  ${r.operation}  ${r.id}`).join("\n"));
