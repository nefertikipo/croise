import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    viewport: { width: 1280, height: 720 },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  const page = await context.newPage();

  // Search for the word ANE
  console.log("=== Searching word: ANE ===");
  await page.goto("https://www.fsolver.fr/mots-fleches/ANE", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // Scroll down to load more content
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  // Get full page text
  const text = await page.innerText("body").catch(() => "");
  console.log(text.slice(0, 4000));

  // Also extract any structured elements
  console.log("\n\n=== HTML structure around definitions ===");
  const html = await page.content();

  // Look for definition-like elements
  const defs = await page.$$eval("[class*=def], [class*=clue], [class*=result], li, .card, .list-group-item", (els) =>
    els
      .filter((el) => {
        const t = el.textContent?.trim() ?? "";
        return t.length > 5 && t.length < 200;
      })
      .slice(0, 30)
      .map((el) => ({
        tag: el.tagName,
        class: el.className,
        text: el.textContent?.trim().slice(0, 120),
      })),
  );
  console.log("Structured elements:");
  for (const d of defs) {
    console.log(`  <${d.tag} class="${d.class}"> ${d.text}`);
  }

  // Try another word
  console.log("\n\n=== Searching word: NAPOLEON ===");
  await page.goto("https://www.fsolver.fr/mots-fleches/NAPOLEON", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  const text2 = await page.innerText("body").catch(() => "");
  console.log(text2.slice(0, 4000));

  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch(console.error);
