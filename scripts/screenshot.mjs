import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3000/style-guide";
const out = process.argv[3] ?? "d:/SIH 2026/SIH26127/scripts/screenshot.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
await page.goto(url, { waitUntil: "networkidle" });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log("saved", out);
