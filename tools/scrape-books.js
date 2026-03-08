// node tools/scrape-books-some.js
import { chromium } from 'playwright';
import fs from 'fs/promises';

const BASE = 'https://books.toscrape.com/';
const ALLOWED_CATEGORIES = new Set(['Travel', 'Mystery']);
const GET_DETAILS = true;
const NAV_TIMEOUT = 60000;
const ACT_TIMEOUT = 60000;
const OPTIONAL_TIMEOUT = 5000;
const PAGE_DELAY_MS = 150;
const PRODUCT_DELAY_MS = 40;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const abs = (href, base) => new URL(href, base).toString();

async function scrapeAllowed() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT);
  page.setDefaultTimeout(ACT_TIMEOUT);

  const categories = [];
  const products = [];

  try {
    // 1) Home → get all categories
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    const allCats = await page.$$eval('ul.nav-list li ul li a', as =>
      as.map(a => ({
        name: a.textContent.trim(),
        href: a.getAttribute('href'),
        locator: `getByRole('link', { name: '${a.textContent.trim()}' })`
      }))
    );

    // 2) Filter to Travel + Mystery
    const targetCats = allCats
      .map(c => ({ name: c.name, url: abs(c.href, BASE), locator: c.locator }))
      .filter(c => ALLOWED_CATEGORIES.has(c.name));

    for (const cat of targetCats) {
      categories.push(cat);
      let currentUrl = cat.url;

      while (true) {
        // Go to category page
        await page.goto(currentUrl, { waitUntil: 'domcontentloaded' });

        // Extract products on this listing page
        const pageProducts = await page.$$eval('.product_pod', cards => {
          return cards.map(card => {
            const a = card.querySelector('h3 a');
            const title = a?.getAttribute('title')?.trim() || a?.textContent?.trim() || '';
            const href = a?.getAttribute('href') || '';
            const price = card.querySelector('.price_color')?.textContent?.trim() || '';

            return {
              title,
              href,
              price,
              locator: `getByRole('link', { name: "${title.replace(/"/g, '\\"')}" })`
            };
          });
        });

        // Visit each product page to capture availability
        for (const p of pageProducts) {
          const productUrl = abs(p.href, currentUrl);
          let availability = '';
          if (GET_DETAILS) {
            try {
              await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
              availability = await page.$eval('.product_main .availability', el => el.textContent.trim());
              await sleep(PRODUCT_DELAY_MS);
            } catch { /* ignore */ }
          }

          products.push({
            category: cat.name,
            title: p.title,
            url: productUrl,
            price: p.price,
            availability,
            locator: p.locator
          });
        }

        // Check for "next"
        let nextHref = null;
        try {
          nextHref = await page.getAttribute('.pager .next a', 'href', { timeout: OPTIONAL_TIMEOUT });
        } catch {
          nextHref = null;
        }
        if (!nextHref) break;

        currentUrl = abs(nextHref, currentUrl);
        await sleep(PAGE_DELAY_MS);
      }
    }

    // Save results
    await fs.mkdir('output', { recursive: true });
    const out = {
      origin: BASE,
      crawledAt: new Date().toISOString(),
      categories,
      products
    };
    await fs.writeFile('output/books-some.json', JSON.stringify(out, null, 2), 'utf8');
    console.log(`Saved ${categories.length} categories, ${products.length} products -> output/books-some.json`);
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

scrapeAllowed();
