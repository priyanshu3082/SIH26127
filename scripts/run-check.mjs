import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`[console:error] ${msg.text()}`);
});

console.log("== City Map ==");
await page.goto("http://localhost:3000/", { waitUntil: "load", timeout: 45000 });
await page.waitForSelector("text=DETECTIONS TODAY", { timeout: 15000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: "scripts/run-citymap.png" });
console.log("screenshot saved: scripts/run-citymap.png");

console.log("== Trajectory: search + playback ==");
await page.goto("http://localhost:3000/trajectory", { waitUntil: "load", timeout: 45000 });
await page.waitForSelector('input[placeholder="WB 20 AB 1234"]');
await page.fill('input[placeholder="WB 20 AB 1234"]', "WB05CF3475");
await page.click('button:has-text("Track")');
await page.waitForSelector("text=STOPS", { timeout: 10000 });
await page.click('button svg.lucide-play >> xpath=..').catch(() => {});
await page.waitForTimeout(2500);
await page.screenshot({ path: "scripts/run-trajectory.png" });
console.log("screenshot saved: scripts/run-trajectory.png");

await browser.close();

console.log("\n== Console/page errors captured ==");
if (errors.length === 0) {
  console.log("none");
} else {
  for (const e of errors) console.log(e);
}
