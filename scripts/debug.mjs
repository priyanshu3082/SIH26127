import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3000/";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

page.on("console", (msg) => console.log(`[console:${msg.type()}]`, msg.text()));
page.on("pageerror", (err) => console.log("[pageerror]", err.message));
page.on("requestfailed", (req) => console.log("[requestfailed]", req.url(), req.failure()?.errorText));
page.on("request", (req) => console.log("[request]", req.method(), req.url()));
page.on("response", (res) => {
  console.log("[response]", res.status(), res.url());
});

await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => console.log("[goto error]", e.message));
await page.waitForTimeout(3000);
await page.screenshot({ path: "scripts/debug.png", fullPage: false });
await browser.close();
