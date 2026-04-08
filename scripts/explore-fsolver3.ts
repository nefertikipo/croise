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

  // Check the dictionary pages
  console.log("=== dictionnaire-mots-fleches ===");
  await page.goto("https://www.fsolver.fr/dictionnaire-mots-fleches", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);
  const text = await page.innerText("body").catch(() => "");
  console.log(text.slice(0, 3000));

  // Check links
  const links = await page.$$eval("a[href]", (els) =>
    els.map((el) => ({ href: el.href, text: el.textContent?.trim().slice(0, 60) }))
      .filter((l) => l.href.includes("fsolver.fr") && !l.href.includes("login") && !l.href.includes("register") && l.text.length > 2)
      .slice(0, 40),
  );
  console.log("\nLinks:");
  for (const l of links) console.log(`  ${l.text} → ${l.href}`);

  await page.waitForTimeout(2000);
  await browser.close();
}

main().catch(console.error);
