import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const NAV_TIMEOUT = 60000;
const ACT_TIMEOUT = 60000;
const OPTIONAL_TIMEOUT = 5000;
const PAGE_DELAY_MS = 150;
const PRODUCT_DELAY_MS = 40;
const MAX_PAGES_DEFAULT = 50;
const DEFAULT_ALLOWED_CATEGORIES = ['Travel', 'Mystery'];
const GET_DETAILS = true;

const abs = (href, base) => new URL(href, base).toString();
const safeFilePart = (value) => value.toLowerCase().replace(/[^a-z0-9.-]+/g, '-').replace(/^-+|-+$/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function scrapeUrl(targetUrl, options = {}) {
  const { maxPages = MAX_PAGES_DEFAULT, outputFile, allowedCategories = DEFAULT_ALLOWED_CATEGORIES } = options;
  const startUrl = abs(targetUrl, targetUrl);
  const allowed = new Set((allowedCategories || []).map((c) => `${c}`.trim()).filter(Boolean));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT);
  page.setDefaultTimeout(ACT_TIMEOUT);

  const categories = [];
  const products = [];

  try {
    await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

    const allCats = await page.$$eval('ul.nav-list li ul li a', (as) =>
      as.map((a) => {
        const name = (a.textContent || '').trim();
        return {
          name,
          href: a.getAttribute('href') || '',
          locator: `getByRole('link', { name: '${name.replace(/'/g, "\\'")}' })`,
        };
      })
    );

    const normalizedCats = allCats
      .map((c) => ({
        name: c.name,
        url: abs(c.href, startUrl),
        locator: c.locator,
      }))
      .filter((c) => c.name && c.url);

    const selectedCats = allowed.size > 0
      ? normalizedCats.filter((c) => allowed.has(c.name))
      : normalizedCats;

    for (const cat of selectedCats) {
      categories.push(cat);
      let currentUrl = cat.url;
      let pageCount = 0;

      while (currentUrl && pageCount < maxPages) {
        await page.goto(currentUrl, { waitUntil: 'domcontentloaded' });
        pageCount += 1;

        const pageProducts = await page.$$eval('.product_pod', (cards) =>
          cards.map((card) => {
            const a = card.querySelector('h3 a');
            const title = a?.getAttribute('title')?.trim() || a?.textContent?.trim() || '';
            const href = a?.getAttribute('href') || '';
            const price = card.querySelector('.price_color')?.textContent?.trim() || '';

            return {
              title,
              href,
              price,
              locator: `getByRole('link', { name: "${title.replace(/"/g, '\\"')}" })`,
            };
          })
        );

        for (const p of pageProducts) {
          const productUrl = abs(p.href, currentUrl);
          let availability = '';

          if (GET_DETAILS) {
            try {
              await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
              availability = await page.$eval('.product_main .availability', (el) => (el.textContent || '').trim());
              await sleep(PRODUCT_DELAY_MS);
            } catch {
              availability = '';
            }
          }

          products.push({
            category: cat.name,
            title: p.title,
            url: productUrl,
            price: p.price,
            availability,
            locator: p.locator,
          });
        }

        let nextHref = null;
        try {
          nextHref = await page.getAttribute('.pager .next a', 'href', { timeout: OPTIONAL_TIMEOUT });
        } catch {
          nextHref = null;
        }

        currentUrl = nextHref ? abs(nextHref, currentUrl) : '';
        if (currentUrl) await sleep(PAGE_DELAY_MS);
      }
    }

    const host = safeFilePart(new URL(startUrl).hostname);
    const fileName = outputFile || `${host}-books-some.json`;
    const outputPath = path.join('output', fileName);

    await fs.mkdir('output', { recursive: true });
    const out = {
      origin: startUrl,
      crawledAt: new Date().toISOString(),
      categories,
      products,
    };
    await fs.writeFile(outputPath, JSON.stringify(out, null, 2), 'utf8');
    console.log(`Saved ${categories.length} categories, ${products.length} products -> ${outputPath}`);

    return { outputPath, data: out };
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function runFromCli() {
  const inputUrl = process.argv[2];
  const outputFile = process.argv[3];
  const maxPagesArg = process.argv[4];

  if (!inputUrl) {
    console.error('Usage: node tools/scrape-books.js <url> [outputFileName] [maxPages]');
    process.exit(1);
  }

  const maxPages = Number.parseInt(maxPagesArg || `${MAX_PAGES_DEFAULT}`, 10);
  await scrapeUrl(inputUrl, {
    outputFile,
    maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : MAX_PAGES_DEFAULT,
  });
}

const isDirectExecution = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectExecution) {
  runFromCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
