import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

page.on("pageerror", (err) => console.log("[pageerror]", err.message));
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("[console:error]", msg.text());
});

await page.goto("http://localhost:3000/trajectory", { waitUntil: "load", timeout: 45000 });
await page.waitForTimeout(1500);
await page.fill('input[placeholder="WB 20 AB 1234"]', "WB05CF3475");
await page.click('button:has-text("Track")');
await page.waitForTimeout(3000);
await page.screenshot({ path: "scripts/trajectory.png" });
await browser.close();
