/**
 * Explore fsolver.fr with Playwright in headed mode to pass Cloudflare.
 */
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: false, // Visible browser to pass Cloudflare challenge
    args: [
      "--disable-blink-features=AutomationControlled",
    ],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
  });

  // Remove webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  const page = await context.newPage();

  console.log("Loading fsolver.fr (headed mode, waiting for Cloudflare)...");
  await page.goto("https://www.fsolver.fr/", { waitUntil: "networkidle", timeout: 30000 });

  // Wait for Cloudflare challenge to complete (up to 15s)
  console.log("Waiting for page to load past Cloudflare...");
  await page.waitForTimeout(5000);

  console.log("Title:", await page.title());
  const url = page.url();
  console.log("URL:", url);

  if ((await page.title()).includes("Cloudflare") || (await page.title()).includes("Attention")) {
    console.log("Still blocked by Cloudflare. Waiting longer...");
    await page.waitForTimeout(10000);
    console.log("Title now:", await page.title());
  }

  // If we're past Cloudflare, explore the homepage
  const pageContent = await page.content();
  console.log("Page length:", pageContent.length);

  // Look for navigation/index links
  const links = await page.$$eval("a[href]", (els) =>
    els
      .map((el) => ({ href: el.href, text: el.textContent?.trim().slice(0, 80) }))
      .filter((l) => l.href.includes("fsolver.fr"))
      .slice(0, 30),
  );
  console.log("\nLinks on homepage:");
  for (const l of links) {
    console.log(`  ${l.text} → ${l.href}`);
  }

  // Try a definition page
  console.log("\nNavigating to a definition page...");
  await page.goto("https://www.fsolver.fr/mots-fleches/KARACHI+EST+SA+CAPITALE", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);
  console.log("Title:", await page.title());

  // Extract answer elements
  const bodyText = await page.innerText("body").catch(() => "");
  console.log("\nBody text (first 2000 chars):");
  console.log(bodyText.slice(0, 2000));

  // Keep browser open for 5s so you can see it
  await page.waitForTimeout(5000);
  await browser.close();
}

main().catch(console.error);
