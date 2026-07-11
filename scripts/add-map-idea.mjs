// Add "a map of where you met" as a gift idea to the couple-focused guides.
// Idempotent. No em dashes.
// Usage: SANITY_WRITE_TOKEN=xxx node scripts/add-map-idea.mjs

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "bpesgoqn";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = "2026-02-01";
const token = process.env.SANITY_WRITE_TOKEN;
if (!token) {
  console.error("Missing SANITY_WRITE_TOKEN");
  process.exit(1);
}

const TARGET_IDS = [
  "guide-cadeaux-saint-valentin-personnalises",
  "guide-cadeaux-personnalises-couple",
];
const VOLATILE = new Set(["_rev", "_createdAt", "_updatedAt", "_system"]);
const stripVolatile = (doc) =>
  Object.fromEntries(Object.entries(doc).filter(([k]) => !VOLATILE.has(k)));

let keySeq = 0;
const key = () => `map${(keySeq++).toString(36)}`;

const MAP_ITEM = {
  _type: "giftItem",
  name: "Une carte de l'endroit où vous vous êtes rencontrés",
  description:
    "Un poster de la carte du lieu de votre rencontre ou de votre premier rendez-vous, avec la date et les coordonnées, à encadrer.",
};
const MARKER = "où vous vous êtes rencontrés";

const base = `https://${projectId}.api.sanity.io/v${apiVersion}/data`;
const q = `*[_id in $ids]`;
const qUrl = `${base}/query/${dataset}?query=${encodeURIComponent(q)}&$ids=${encodeURIComponent(JSON.stringify(TARGET_IDS))}`;
const { result: docs } = await (
  await fetch(qUrl, { headers: { Authorization: `Bearer ${token}` } })
).json();
if (!docs?.length) {
  console.error("No target guides found");
  process.exit(1);
}

const mutations = [];
for (const raw of docs) {
  const doc = stripVolatile(raw);
  const items = Array.isArray(doc.items) ? doc.items : [];
  if (items.some((it) => (it.name || "").includes(MARKER))) {
    console.log(`  skip (already has map): ${doc._id}`);
    continue;
  }
  // Insert at index 1 so it sits mid-list and our book stays not-first.
  const newItem = { ...MAP_ITEM, _key: key() };
  const nextItems = [items[0], newItem, ...items.slice(1)].filter(Boolean);
  mutations.push({ createOrReplace: { ...doc, items: nextItems } });
}

if (!mutations.length) {
  console.log("Nothing to add.");
  process.exit(0);
}
const mRes = await fetch(`${base}/mutate/${dataset}?returnIds=true`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ mutations }),
});
const mJson = await mRes.json();
if (!mRes.ok) {
  console.error("Failed:", JSON.stringify(mJson, null, 2));
  process.exit(1);
}
console.log("Added map idea to:");
console.log((mJson.results || []).map((r) => `  ${r.operation}  ${r.id}`).join("\n"));
