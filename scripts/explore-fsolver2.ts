import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  const page = await context.newPage();

  // Try community section
  console.log("Checking communaute...");
  await page.goto("https://www.fsolver.fr/communaute", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log("Title:", await page.title());
  const communityText = await page.innerText("body").catch(() => "");
  console.log(communityText.slice(0, 1500));

  // Try a real clue search that should return results
  console.log("\n\n=== Searching: CAPITALE DU PAKISTAN ===");
  await page.goto("https://www.fsolver.fr/mots-fleches/CAPITALE+DU+PAKISTAN", {
    waitUntil: "networkidle", timeout: 30000,
  });
  await page.waitForTimeout(3000);
  const searchText = await page.innerText("body").catch(() => "");
  console.log(searchText.slice(0, 2000));

  // Try another well-known clue
  console.log("\n\n=== Searching: ANIMAL TETU ===");
  await page.goto("https://www.fsolver.fr/mots-fleches/ANIMAL+TETU", {
    waitUntil: "networkidle", timeout: 30000,
  });
  await page.waitForTimeout(3000);
  const searchText2 = await page.innerText("body").catch(() => "");
  console.log(searchText2.slice(0, 2000));

  // Check blog for indexes
  console.log("\n\n=== Blog ===");
  await page.goto("https://www.fsolver.fr/blog", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  const links = await page.$$eval("a[href]", (els) =>
    els.map((el) => ({ href: el.href, text: el.textContent?.trim().slice(0, 80) }))
      .filter((l) => l.href.includes("fsolver.fr") && l.text.length > 3)
      .slice(0, 20),
  );
  for (const l of links) console.log(`  ${l.text} → ${l.href}`);

  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch(console.error);
