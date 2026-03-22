import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
await page.goto(`file://${join(__dirname, 'og-gen.html')}`, { waitUntil: 'networkidle0' });
// Wait for fonts to load
await page.evaluate(() => document.fonts.ready);
await new Promise(r => setTimeout(r, 500));
await page.screenshot({ path: join(__dirname, 'public/og-image.png'), type: 'png' });
await browser.close();
console.log('✓ og-image.png generated');