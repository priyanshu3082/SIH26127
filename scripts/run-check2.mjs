import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`[console:error] ${msg.text()}`);
});

console.log("== Alerts (table) ==");
await page.goto("http://localhost:3000/alerts", { waitUntil: "load", timeout: 45000 });
await page.waitForSelector("text=PLATE", { timeout: 10000 }).catch(() => console.log("no PLATE header found"));
await page.waitForTimeout(1000);
await page.screenshot({ path: "scripts/alerts-table.png" });

console.log("== Alerts (map tab) ==");
await page.click('button:has-text("Map")');
await page.waitForTimeout(2500);
await page.screenshot({ path: "scripts/alerts-map.png" });

console.log("== Watchlist ==");
await page.goto("http://localhost:3000/watchlist", { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: "scripts/watchlist.png" });

console.log("== Watchlist: add entry ==");
await page.click('button:has-text("Add to Watchlist")');
await page.waitForTimeout(300);
await page.fill('input[placeholder="WB 20 AB 1234"]', "WB99ZZ9999");
await page.fill('input[placeholder="Reported stolen — FIR #..."]', "Playwright smoke test entry");
await page.click('button[type="submit"]:has-text("Add to Watchlist")');
await page.waitForTimeout(1000);
await page.screenshot({ path: "scripts/watchlist-added.png" });

await browser.close();

console.log("\n== Console/page errors captured ==");
if (errors.length === 0) console.log("none");
else for (const e of errors) console.log(e);
