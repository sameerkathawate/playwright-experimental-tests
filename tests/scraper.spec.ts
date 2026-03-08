import { test, expect } from '@playwright/test';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);

test('run scraper for provided target URL and generate output file', async () => {
  test.setTimeout(10 * 60 * 1000);

  const repoRoot = process.cwd();
  const scriptPath = path.join(repoRoot, 'tools', 'scrape-books.js');
  const targetUrl = process.env.TARGET_URL || 'https://books.toscrape.com/';
  const outputFileName = 'scraper-output.json';
  const maxPages = process.env.MAX_PAGES || '3';

  const outputPath = path.join(repoRoot, 'output', outputFileName);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.rm(outputPath, { force: true });

  await execFileAsync(
    process.execPath,
    ['--experimental-default-type=module', scriptPath, targetUrl as string, outputFileName, maxPages],
    {
      cwd: repoRoot,
      timeout: 8 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  const raw = await fs.readFile(outputPath, 'utf8');
  const data = JSON.parse(raw);

  expect(new URL(data.origin).toString()).toBe(new URL(targetUrl as string).toString());
  expect(Array.isArray(data.categories)).toBeTruthy();
  expect(Array.isArray(data.products)).toBeTruthy();

  if (new URL(targetUrl as string).hostname.includes('books.toscrape.com')) {
    expect(data.categories.length).toBeGreaterThan(0);
    expect(data.products.length).toBeGreaterThan(0);
  }
});
